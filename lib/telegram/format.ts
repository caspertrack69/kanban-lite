import { STATUS_LABELS } from "@/lib/constants";
import type { ProjectDTO, TaskDTO } from "@/lib/types";

const DEFAULT_MAX_LINES = 30;
const DEFAULT_MAX_CHARS = 3200;

const SUBTASK_TITLE_LIMIT = 60;

/** Telegram HTML mode only needs these three entities escaped. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function shortTitle(title: string, limit = 80): string {
  return title.length > limit ? `${title.slice(0, limit - 1)}…` : title;
}

/** Inline code span. Renders as tappable on Telegram and stays escaped. */
export function code(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

function taskRef(task: TaskDTO): string {
  return code(`#${task.id}`);
}

function projectSuffix(task: TaskDTO, includeProject: boolean): string {
  return includeProject && task.project
    ? ` — ${escapeHtml(task.project.name)}`
    : "";
}

function subtaskProgress(task: TaskDTO): string {
  if (task.subtasks.length === 0) return "";
  const done = task.subtasks.filter((subtask) => subtask.doneAt !== null).length;
  return ` (${done}/${task.subtasks.length})`;
}

export type TaskListInput = {
  heading: string;
  tasks: TaskDTO[];
  includeProject: boolean;
  /** Already-formatted HTML shown when there are no tasks. */
  emptyHint: string;
  maxLines?: number;
  maxChars?: number;
};

export function renderTaskList(input: TaskListInput): string {
  const maxLines = input.maxLines ?? DEFAULT_MAX_LINES;
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
  const count = input.tasks.length;
  const header = `<b>${escapeHtml(input.heading)}</b>\n${count} top-level ${
    count === 1 ? "task" : "tasks"
  }`;

  if (count === 0) {
    return `${header}\n\n${input.emptyHint}`;
  }

  const lines: string[] = [];
  let characters = header.length;
  let truncated = false;

  for (const status of ["backlog", "todo"] as const) {
    const group = input.tasks.filter((task) => task.status === status);
    if (group.length === 0) continue;

    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }

    const groupHeading = `<b>${STATUS_LABELS[status]} (${group.length})</b>`;
    lines.push(groupHeading);
    characters += groupHeading.length + 1;

    for (const task of group) {
      const parentLine = `${taskRef(task)} ${escapeHtml(
        shortTitle(task.title),
      )}${projectSuffix(task, input.includeProject)}${subtaskProgress(task)}`;

      if (
        lines.length >= maxLines ||
        characters + parentLine.length + 1 > maxChars
      ) {
        truncated = true;
        break;
      }

      lines.push(parentLine);
      characters += parentLine.length + 1;

      for (const subtask of task.subtasks) {
        const mark = subtask.doneAt !== null ? "[x]" : "[ ]";
        const subtaskLine = `   ${mark} ${taskRef(subtask)} ${escapeHtml(
          shortTitle(subtask.title, SUBTASK_TITLE_LIMIT),
        )}`;

        if (
          lines.length >= maxLines ||
          characters + subtaskLine.length + 1 > maxChars
        ) {
          truncated = true;
          break;
        }

        lines.push(subtaskLine);
        characters += subtaskLine.length + 1;
      }

      if (truncated) break;
    }

    if (truncated) break;
  }

  return [
    header,
    "",
    ...lines,
    ...(truncated
      ? ["", "<i>List truncated. Open the web app for the full backlog.</i>"]
      : []),
  ].join("\n");
}

export function renderProjects(projects: ProjectDTO[]): string {
  if (projects.length === 0) {
    return [
      "<b>No projects yet</b>",
      "",
      `Create one: ${code("/newproject Personal")}`,
    ].join("\n");
  }

  const lines = projects.map((project, index) => {
    const tasks = `${project.taskCount} ${
      project.taskCount === 1 ? "task" : "tasks"
    }`;
    return `${code(String(index + 1))}. ${escapeHtml(project.name)} — ${tasks}`;
  });

  return [
    `<b>Projects (${projects.length})</b>`,
    "",
    ...lines,
    "",
    `Use names or numbers: ${code("/list 1")} · ${code(
      "/add 1 <title>",
    )}`,
  ].join("\n");
}

export function renderDoing(tasks: TaskDTO[], limit: number): string {
  const header = `<b>Doing ${tasks.length}/${limit}</b>`;

  if (tasks.length === 0) {
    return [
      header,
      "",
      `The focus column is clear. Pull a task from ${code(
        "/list",
      )} with ${code("/move <id> doing")}.`,
    ].join("\n");
  }

  const remaining = Math.max(limit - tasks.length, 0);
  const lines = tasks.map(
    (task) =>
      `${taskRef(task)} ${escapeHtml(shortTitle(task.title))}${projectSuffix(
        task,
        true,
      )}${subtaskProgress(task)}`,
  );

  return [
    `${header} — ${remaining} ${remaining === 1 ? "slot" : "slots"} left`,
    "",
    ...lines,
    "",
    `Finish one: ${code("/move <id> done")} · check a subtask: ${code(
      "/done <id>",
    )}`,
  ].join("\n");
}

export function renderProjectNotFound(
  attempted: string,
  suggestions: string[],
  projects: ProjectDTO[],
): string {
  const parts = [
    "<b>Project not found</b>",
    `No project matches "${escapeHtml(shortTitle(attempted, 60))}".`,
  ];

  if (suggestions.length > 0) {
    parts.push("", "<b>Closest matches</b>");
    parts.push(...suggestions.map((name) => `• ${escapeHtml(name)}`));
  }

  if (projects.length === 0) {
    parts.push("", `No projects yet. Create one: ${code("/newproject Personal")}`);
    return parts.join("\n");
  }

  parts.push("", "<b>Projects</b>");
  parts.push(
    ...projects.map(
      (project, index) => `${code(String(index + 1))}. ${escapeHtml(project.name)}`,
    ),
  );
  parts.push("", `Use the number or the name: ${code("/add 1 <title>")}`);

  return parts.join("\n");
}

export function renderHelp(): string {
  return [
    "<b>Kanban Lite</b>",
    "",
    "<b>Capture</b>",
    "• Any text — goes to Inbox, first line becomes the title",
    `• ${code("/add <project> <title>")} — add to a project backlog`,
    "",
    "<b>Browse</b>",
    `• ${code("/projects")} — numbered projects with task counts`,
    `• ${code("/list [project|number]")} — Backlog and To Do`,
    `• ${code("/doing")} — current focus against the Doing limit`,
    "",
    "<b>Update</b>",
    `• ${code("/move <id> <backlog|todo|doing|done>")}`,
    `• ${code("/done <id>")} — complete a task or check a subtask`,
    "",
    "<b>Other</b>",
    `• ${code("/newproject <name>")}`,
    `• ${code("/help")}`,
    "",
    `Every task shows an id like ${code(
      "#12",
    )}. Projects can be used by name or by the number from ${code("/projects")}.`,
  ].join("\n");
}

export function renderUnknownCommand(command: string): string {
  return [
    `<b>Unknown command</b> ${code(`/${command}`)}`,
    "",
    `Send ${code("/help")} to see every command.`,
  ].join("\n");
}
