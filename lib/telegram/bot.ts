import { Bot, webhookCallback, type Context } from "grammy";
import { ZodError } from "zod";
import { getDb } from "@/db/client";
import type { AppDatabase } from "@/db/client";
import { listProjectRows } from "@/db/queries/projects";
import { getDoingLimit } from "@/db/queries/settings";
import {
  getTaskDetail,
  listDoingTasks,
  listTelegramTasks,
} from "@/db/queries/tasks";
import {
  createProjectWithNextColor,
  listProjectsService,
} from "@/db/services/projects";
import { createTask, updateTask } from "@/db/services/tasks";
import { STATUS_LABELS } from "@/lib/constants";
import { AppError, messageForError } from "@/lib/errors";
import { passwordMatches } from "@/lib/password";
import type { TaskDTO } from "@/lib/types";
import {
  parseTelegramMessage,
  type ParsedTelegramMessage,
} from "./parse";

type TelegramConfig = {
  token: string;
  ownerId: number;
  webhookSecret: string;
};

export type TelegramWebhookHandler = (request: Request) => Promise<Response>;

const HELP_TEXT = [
  "Kanban Lite commands",
  "",
  "Send plain text to capture it in Inbox.",
  "/add <project> <title> — add to a project backlog",
  "/list [project] — backlog and To Do tasks",
  "/doing — cards currently in Doing",
  "/move <id> <backlog|todo|doing|done> — move a task",
  "/done <id> — complete a task or check a subtask",
  "/projects — list projects",
  "/newproject <name> — create a project",
  "/help — show this message",
].join("\n");

function readConfig(): TelegramConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const ownerRaw = process.env.TELEGRAM_OWNER_ID?.trim();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const ownerId = Number(ownerRaw);

  if (!token || !ownerRaw || !webhookSecret || !Number.isInteger(ownerId)) {
    throw new AppError(
      503,
      "MISCONFIGURED",
      "Telegram is not configured. Set TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_ID, and TELEGRAM_WEBHOOK_SECRET.",
    );
  }

  return { token, ownerId, webhookSecret };
}

/**
 * Validates the webhook secret before the bot initializes. grammY also checks
 * the same header; this early check keeps unauthorized requests from touching
 * the Telegram API on a cold start.
 */
export function assertTelegramWebhookSecret(request: Request): void {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) {
    throw new AppError(
      503,
      "MISCONFIGURED",
      "Telegram is not configured. Set TELEGRAM_WEBHOOK_SECRET.",
    );
  }

  const provided = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );
  if (!provided || !passwordMatches(provided, expected)) {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Invalid Telegram webhook secret.",
    );
  }
}

function shortTitle(title: string, limit = 80): string {
  return title.length > limit ? `${title.slice(0, limit - 1)}…` : title;
}

function lineForTask(task: TaskDTO, includeProject: boolean): string {
  const status = task.status ? STATUS_LABELS[task.status] : "Task";
  const project =
    includeProject && task.project ? ` — ${task.project.name}` : "";
  return `#${task.id} [${status}] ${shortTitle(task.title)}${project}`;
}

function listTaskLines(
  tasks: TaskDTO[],
  includeProject: boolean,
): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
  let truncated = false;

  for (const parent of tasks) {
    if (lines.length >= 50) {
      truncated = true;
      break;
    }
    lines.push(lineForTask(parent, includeProject));

    for (const subtask of parent.subtasks) {
      if (lines.length >= 50) {
        truncated = true;
        break;
      }
      lines.push(
        `   ${subtask.doneAt !== null ? "[x]" : "[ ]"} #${subtask.id} ${shortTitle(subtask.title)}`,
      );
    }

    if (truncated) break;
  }

  return { lines, truncated };
}

async function projectListText(db: AppDatabase): Promise<string> {
  const projects = await listProjectRows(db);
  if (projects.length === 0) {
    return "No projects yet. Create one with /newproject <name>.";
  }
  return `Projects:\n${projects
    .map((project) => `• ${project.name} (${project.color})`)
    .join("\n")}`;
}

async function handleAdd(
  ctx: Context,
  parsed: Extract<ParsedTelegramMessage, { type: "add" }>,
  db: AppDatabase,
): Promise<void> {
  const task = await createTask(db, {
    title: parsed.title,
    status: "backlog",
    projectId: parsed.projectId,
  });
  await ctx.reply(
    `Added #${task.id} to ${parsed.projectName}: ${shortTitle(task.title)}`,
  );
}

async function handleList(
  ctx: Context,
  parsed: Extract<ParsedTelegramMessage, { type: "list" }>,
  db: AppDatabase,
): Promise<void> {
  const tasks = await listTelegramTasks(db, parsed.projectId);
  const heading = parsed.projectName
    ? `Backlog and To Do for ${parsed.projectName}`
    : "Backlog and To Do";

  if (tasks.length === 0) {
    await ctx.reply(`${heading}: no tasks.`);
    return;
  }

  const { lines, truncated } = listTaskLines(tasks, !parsed.projectName);
  await ctx.reply(
    [
      `${heading} (${tasks.length} top-level)`,
      "",
      ...lines,
      ...(truncated ? ["", "…and more. Use the web app for the full list."] : []),
    ].join("\n"),
  );
}

async function handleDoing(ctx: Context, db: AppDatabase): Promise<void> {
  const [tasks, limit] = await Promise.all([
    listDoingTasks(db),
    getDoingLimit(db),
  ]);

  if (tasks.length === 0) {
    await ctx.reply(`Doing 0/${limit}. The focus column is clear.`);
    return;
  }

  const lines = tasks.map((task) => {
    const project = task.project ? ` — ${task.project.name}` : "";
    const progress =
      task.subtasks.length > 0
        ? ` (${task.subtasks.filter((subtask) => subtask.doneAt !== null).length}/${task.subtasks.length} subtasks)`
        : "";
    return `#${task.id} ${shortTitle(task.title)}${project}${progress}`;
  });

  await ctx.reply(
    [`Doing ${tasks.length}/${limit}`, "", ...lines].join("\n"),
  );
}

async function handleMove(
  ctx: Context,
  parsed: Extract<ParsedTelegramMessage, { type: "move" }>,
  db: AppDatabase,
): Promise<void> {
  try {
    const task = await updateTask(db, parsed.taskId, {
      status: parsed.status,
    });
    await ctx.reply(
      `Moved #${task.id} to ${STATUS_LABELS[parsed.status]}: ${shortTitle(task.title)}`,
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "SUBTASK_STATUS_LOCKED"
    ) {
      await ctx.reply(
        `#${parsed.taskId} is a sub-task and follows its parent. Use /done ${parsed.taskId} to check it.`,
      );
      return;
    }
    throw error;
  }
}

async function handleDone(
  ctx: Context,
  taskId: number,
  db: AppDatabase,
): Promise<void> {
  const task = await getTaskDetail(db, taskId);
  if (!task) {
    await ctx.reply(`Task #${taskId} was not found.`);
    return;
  }

  if (task.parentId !== null) {
    if (task.doneAt !== null) {
      await ctx.reply(`Sub-task #${task.id} is already checked.`);
      return;
    }
    const checked = await updateTask(db, task.id, { completed: true });
    await ctx.reply(`Checked #${checked.id}: ${shortTitle(checked.title)}`);
    return;
  }

  if (task.status === "inbox") {
    await ctx.reply(
      `#${task.id} is in Inbox. Assign a project in the web app before marking it done.`,
    );
    return;
  }

  if (task.status === "done") {
    await ctx.reply(`#${task.id} is already done.`);
    return;
  }

  const done = await updateTask(db, task.id, { status: "done" });
  await ctx.reply(`Done #${done.id}: ${shortTitle(done.title)}`);
}

async function handleNewProject(
  ctx: Context,
  name: string,
  db: AppDatabase,
): Promise<void> {
  const project = await createProjectWithNextColor(db, name);
  await ctx.reply(
    `Created project ${project.name} (${project.color}). Use /add ${project.name} <title> to add tasks.`,
  );
}

async function handleProjects(ctx: Context, db: AppDatabase): Promise<void> {
  const projects = await listProjectsService(db);
  if (projects.length === 0) {
    await ctx.reply("No projects yet. Create one with /newproject <name>.");
    return;
  }

  await ctx.reply(
    `Projects:\n${projects
      .map(
        (project) =>
          `• ${project.name} — ${project.color} (${project.taskCount} ${project.taskCount === 1 ? "task" : "tasks"})`,
      )
      .join("\n")}`,
  );
}

async function handleParsed(
  ctx: Context,
  parsed: ParsedTelegramMessage,
  db: AppDatabase,
): Promise<void> {
  switch (parsed.type) {
    case "inbox": {
      const task = await createTask(db, {
        title: parsed.title,
        note: parsed.note,
        status: "inbox",
      });
      await ctx.reply(`Captured #${task.id} in Inbox: ${shortTitle(task.title)}`);
      return;
    }
    case "add":
      await handleAdd(ctx, parsed, db);
      return;
    case "list":
      await handleList(ctx, parsed, db);
      return;
    case "doing":
      await handleDoing(ctx, db);
      return;
    case "move":
      await handleMove(ctx, parsed, db);
      return;
    case "done":
      await handleDone(ctx, parsed.taskId, db);
      return;
    case "projects":
      await handleProjects(ctx, db);
      return;
    case "newproject":
      await handleNewProject(ctx, parsed.name, db);
      return;
    case "unknown_project":
      await ctx.reply(
        `Project not found for "${shortTitle(parsed.attempted, 60)}".\n\n${await projectListText(db)}`,
      );
      return;
    case "help":
      await ctx.reply(HELP_TEXT);
      return;
    case "unknown_command":
      await ctx.reply(`Unknown command /${parsed.command}.\n\n${HELP_TEXT}`);
      return;
    case "invalid":
      await ctx.reply(parsed.message);
      return;
  }
}

function createBot(config: TelegramConfig): Bot {
  const bot = new Bot(config.token);

  bot.use(async (ctx, next) => {
    if (!ctx.from || ctx.from.id !== config.ownerId) return;
    if (ctx.chat?.type !== "private") return;
    await next();
  });

  bot.on("message:text", async (ctx) => {
    const { db } = await getDb();
    const projects = await listProjectRows(db);
    const parsed = parseTelegramMessage(ctx.message.text, projects);

    try {
      await handleParsed(ctx, parsed, db);
    } catch (error) {
      if (error instanceof AppError || error instanceof ZodError) {
        await ctx.reply(messageForError(error));
        return;
      }
      throw error;
    }
  });

  bot.catch(async (botError) => {
    console.error("[telegram] Update failed", botError.error);
    const ctx = botError.ctx;
    if (ctx.from?.id === config.ownerId && ctx.chat?.type === "private") {
      await ctx
        .reply("Something went wrong. Check the server logs and try again.")
        .catch(() => undefined);
    }
  });

  return bot;
}

let handlerPromise: Promise<TelegramWebhookHandler> | undefined;

export function getTelegramWebhookHandler(): Promise<TelegramWebhookHandler> {
  if (!handlerPromise) {
    handlerPromise = Promise.resolve()
      .then(() => {
        const config = readConfig();
        const bot = createBot(config);
        return webhookCallback(bot, "std/http", {
          secretToken: config.webhookSecret,
          onTimeout: "return",
        }) as TelegramWebhookHandler;
      })
      .catch((error: unknown) => {
        handlerPromise = undefined;
        throw error;
      });
  }

  return handlerPromise;
}
