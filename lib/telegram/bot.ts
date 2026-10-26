import { Bot, webhookCallback, type Context } from "grammy";
import { ZodError } from "zod";
import { getDb } from "@/db/client";
import type { AppDatabase } from "@/db/client";
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
import type { ProjectDTO } from "@/lib/types";
import {
  code,
  escapeHtml,
  renderDoing,
  renderHelp,
  renderProjectNotFound,
  renderProjects,
  renderTaskList,
  renderUnknownCommand,
  shortTitle,
} from "./format";
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

async function replyHtml(ctx: Context, html: string): Promise<void> {
  await ctx.reply(html, { parse_mode: "HTML" });
}

function notFoundText(taskId: number): string {
  return [
    `<b>Task ${code(`#${taskId}`)} not found</b>`,
    `Find ids with ${code("/list")} or ${code("/doing")}.`,
  ].join("\n");
}

function subtaskLockedText(taskId: number): string {
  return [
    `<b>${code(`#${taskId}`)} is a subtask</b>`,
    `Subtasks follow their parent. Check it with ${code(`/done ${taskId}`)}.`,
  ].join("\n");
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

  await replyHtml(
    ctx,
    [
      `<b>Added to ${escapeHtml(parsed.projectName)} · Backlog</b>`,
      `${code(`#${task.id}`)} ${escapeHtml(shortTitle(task.title))}`,
      "",
      `Schedule it: ${code(`/move ${task.id} todo`)}`,
    ].join("\n"),
  );
}

async function handleList(
  ctx: Context,
  parsed: Extract<ParsedTelegramMessage, { type: "list" }>,
  db: AppDatabase,
): Promise<void> {
  const tasks = await listTelegramTasks(db, parsed.projectId);
  const heading = parsed.projectName
    ? `Backlog and To Do — ${parsed.projectName}`
    : "Backlog and To Do";
  const emptyHint = parsed.projectName
    ? `Nothing here yet. Add a task: ${code(
        `/add ${parsed.projectName} <title>`,
      )}`
    : `Nothing here yet. Pick a project with ${code("/projects")}.`;

  await replyHtml(
    ctx,
    renderTaskList({
      heading,
      tasks,
      includeProject: !parsed.projectName,
      emptyHint,
    }),
  );
}

async function handleDoing(ctx: Context, db: AppDatabase): Promise<void> {
  const [tasks, limit] = await Promise.all([
    listDoingTasks(db),
    getDoingLimit(db),
  ]);

  await replyHtml(ctx, renderDoing(tasks, limit));
}

async function handleMove(
  ctx: Context,
  parsed: Extract<ParsedTelegramMessage, { type: "move" }>,
  db: AppDatabase,
): Promise<void> {
  const current = await getTaskDetail(db, parsed.taskId);
  if (!current) {
    await replyHtml(ctx, notFoundText(parsed.taskId));
    return;
  }

  if (current.parentId !== null) {
    await replyHtml(ctx, subtaskLockedText(current.id));
    return;
  }

  const from = current.status ? STATUS_LABELS[current.status] : "Task";

  try {
    const task = await updateTask(db, parsed.taskId, {
      status: parsed.status,
    });
    await replyHtml(
      ctx,
      [
        `<b>Moved ${code(`#${task.id}`)} ${from} → ${
          STATUS_LABELS[parsed.status]
        }</b>`,
        escapeHtml(shortTitle(task.title)),
      ].join("\n"),
    );
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "SUBTASK_STATUS_LOCKED") {
        await replyHtml(ctx, subtaskLockedText(parsed.taskId));
        return;
      }
      if (error.code === "DOING_LIMIT_REACHED") {
        await replyHtml(
          ctx,
          [
            `<b>${escapeHtml(error.message)}</b>`,
            `Finish something first: ${code(
              "/doing",
            )} lists what is in progress.`,
          ].join("\n"),
        );
        return;
      }
      if (error.code === "PROJECT_REQUIRED") {
        await replyHtml(
          ctx,
          [
            `<b>${code(`#${parsed.taskId}`)} has no project yet</b>`,
            `Assign one in the web app, then move it again.`,
          ].join("\n"),
        );
        return;
      }
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
    await replyHtml(ctx, notFoundText(taskId));
    return;
  }

  if (task.parentId !== null) {
    if (task.doneAt !== null) {
      await replyHtml(ctx, `${code(`#${task.id}`)} is already checked.`);
      return;
    }
    const checked = await updateTask(db, task.id, { completed: true });
    await replyHtml(
      ctx,
      [
        `<b>Checked ${code(`#${checked.id}`)}</b>`,
        escapeHtml(shortTitle(checked.title)),
      ].join("\n"),
    );
    return;
  }

  if (task.status === "inbox") {
    await replyHtml(
      ctx,
      [
        `<b>${code(`#${task.id}`)} is still in Inbox</b>`,
        "Assign a project in the web app, then complete it here.",
      ].join("\n"),
    );
    return;
  }

  if (task.status === "done") {
    await replyHtml(ctx, `${code(`#${task.id}`)} is already done.`);
    return;
  }

  const done = await updateTask(db, task.id, { status: "done" });
  await replyHtml(
    ctx,
    [
      `<b>Completed ${code(`#${done.id}`)}</b>`,
      escapeHtml(shortTitle(done.title)),
      "",
      `Next up: ${code("/doing")}`,
    ].join("\n"),
  );
}

async function handleNewProject(
  ctx: Context,
  name: string,
  db: AppDatabase,
): Promise<void> {
  const project = await createProjectWithNextColor(db, name);
  const projects = await listProjectsService(db);
  const index = projects.findIndex((entry) => entry.id === project.id) + 1;
  const reference = index > 0 ? String(index) : project.name;

  await replyHtml(
    ctx,
    [
      `<b>Created ${escapeHtml(project.name)}</b>`,
      "",
      `Add the first task: ${code(`/add ${reference} Buy milk`)}`,
    ].join("\n"),
  );
}

async function handleProjects(
  ctx: Context,
  projects: ProjectDTO[],
): Promise<void> {
  await replyHtml(ctx, renderProjects(projects));
}

async function handleParsed(
  ctx: Context,
  parsed: ParsedTelegramMessage,
  db: AppDatabase,
  projects: ProjectDTO[],
): Promise<void> {
  switch (parsed.type) {
    case "inbox": {
      const task = await createTask(db, {
        title: parsed.title,
        note: parsed.note,
        status: "inbox",
      });
      await replyHtml(
        ctx,
        [
          "<b>Captured in Inbox</b>",
          `${code(`#${task.id}`)} ${escapeHtml(shortTitle(task.title))}`,
          "",
          "Assign a project in the web app to put it on the board.",
        ].join("\n"),
      );
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
      await handleProjects(ctx, projects);
      return;
    case "newproject":
      await handleNewProject(ctx, parsed.name, db);
      return;
    case "unknown_project":
      await replyHtml(
        ctx,
        renderProjectNotFound(
          parsed.attempted,
          parsed.suggestions,
          projects,
        ),
      );
      return;
    case "help":
      await replyHtml(ctx, renderHelp());
      return;
    case "unknown_command":
      await replyHtml(ctx, renderUnknownCommand(parsed.command));
      return;
    case "invalid":
      await replyHtml(ctx, escapeHtml(parsed.message));
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
    // The same ordered list drives both /projects numbering and /add parsing,
    // so a project number always points at the project the owner just saw.
    const projects = await listProjectsService(db);
    const parsed = parseTelegramMessage(ctx.message.text, projects);

    try {
      await handleParsed(ctx, parsed, db, projects);
    } catch (error) {
      if (error instanceof AppError || error instanceof ZodError) {
        await replyHtml(ctx, escapeHtml(messageForError(error)));
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

/**
 * Builds a webhook-free bot instance. Used by the local long-polling script;
 * the web app itself always goes through the webhook handler below.
 */
export function createTelegramBot(): Bot {
  return createBot(readConfig());
}

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
