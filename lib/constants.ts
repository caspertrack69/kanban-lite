import { PROJECT_COLORS } from "./design-tokens.generated";

export const TASK_STATUSES = [
  "inbox",
  "backlog",
  "todo",
  "doing",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const BOARD_STATUSES = ["todo", "doing", "done"] as const;

export type BoardStatus = (typeof BOARD_STATUSES)[number];

export const MOVABLE_STATUSES = ["backlog", "todo", "doing", "done"] as const;

export type MovableStatus = (typeof MOVABLE_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  backlog: "Backlog",
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

export const BOARD_COLUMN_LABELS: Record<BoardStatus, string> = {
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

export const TASK_VIEWS = ["board", "inbox", "backlog"] as const;

export const DEFAULT_DOING_LIMIT = 3;

export const DONE_WINDOW_DAYS = 7;

export const MAX_TITLE_LENGTH = 200;
export const MAX_NOTE_LENGTH = 2_000;
export const MAX_PROJECT_NAME_LENGTH = 60;

export const SESSION_COOKIE_NAME = "kl_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export const SUBTASK_COLLAPSE_STORAGE_PREFIX = "kl:subtasks-expanded:";

export { PROJECT_COLORS };
