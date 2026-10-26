import {
  MAX_NOTE_LENGTH,
  MAX_TITLE_LENGTH,
  MOVABLE_STATUSES,
  type MovableStatus,
} from "@/lib/constants";

export type TelegramProject = {
  id: number;
  name: string;
};

export type ParsedTelegramMessage =
  | { type: "inbox"; title: string; note: string | null }
  | { type: "add"; projectId: number; projectName: string; title: string }
  | { type: "list"; projectId?: number; projectName?: string }
  | { type: "doing" }
  | { type: "move"; taskId: number; status: MovableStatus }
  | { type: "done"; taskId: number }
  | { type: "projects" }
  | { type: "newproject"; name: string }
  | { type: "help" }
  | { type: "unknown_command"; command: string }
  | { type: "unknown_project"; attempted: string }
  | { type: "invalid"; message: string };

const COMMAND_PATTERN =
  /^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/;

function parsePositiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function findProjectByName(
  projects: TelegramProject[],
  name: string,
): TelegramProject | undefined {
  const normalized = name.trim().toLowerCase();
  return projects.find(
    (project) => project.name.trim().toLowerCase() === normalized,
  );
}

function matchLongestProjectPrefix(
  projects: TelegramProject[],
  input: string,
): { project: TelegramProject; remainder: string } | null {
  const candidates = [...projects].sort(
    (a, b) => b.name.length - a.name.length,
  );

  for (const project of candidates) {
    const name = project.name;
    if (name.length === 0) continue;
    if (!input.toLowerCase().startsWith(name.toLowerCase())) continue;

    const nextCharacter = input[name.length];
    if (nextCharacter !== undefined && !/\s/.test(nextCharacter)) continue;

    return {
      project,
      remainder: input.slice(name.length).trim(),
    };
  }

  return null;
}

function parseInbox(text: string): ParsedTelegramMessage {
  const normalized = text.trim();
  const lines = normalized.split(/\r?\n/);
  let title = lines[0]?.trim() ?? "";
  let note = lines.slice(1).join("\n").trim();

  if (title.length > MAX_TITLE_LENGTH) {
    const overflow = title.slice(MAX_TITLE_LENGTH).trim();
    title = title.slice(0, MAX_TITLE_LENGTH);
    note = [overflow, note].filter(Boolean).join("\n");
  }

  if (note.length > MAX_NOTE_LENGTH) {
    note = note.slice(0, MAX_NOTE_LENGTH);
  }

  return { type: "inbox", title, note: note.length > 0 ? note : null };
}

export function parseTelegramMessage(
  text: string,
  projects: TelegramProject[] = [],
): ParsedTelegramMessage {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return { type: "invalid", message: "Send a task title or a command." };
  }

  if (!normalized.startsWith("/")) {
    return parseInbox(normalized);
  }

  const match = normalized.match(COMMAND_PATTERN);
  if (!match) {
    return {
      type: "invalid",
      message: "That command could not be parsed.",
    };
  }

  const command = match[1].toLowerCase();
  const args = (match[2] ?? "").trim();

  switch (command) {
    case "start":
    case "help":
      return { type: "help" };

    case "add": {
      if (args.length === 0) {
        return {
          type: "invalid",
          message: "Usage: /add <project> <title>",
        };
      }

      const found = matchLongestProjectPrefix(projects, args);
      if (!found) {
        return { type: "unknown_project", attempted: args };
      }
      if (found.remainder.length === 0) {
        return {
          type: "invalid",
          message: `Add a title after the project name, for example: /add ${found.project.name} Fix login`,
        };
      }

      return {
        type: "add",
        projectId: found.project.id,
        projectName: found.project.name,
        title: found.remainder,
      };
    }

    case "list": {
      if (args.length === 0) return { type: "list" };
      const found = findProjectByName(projects, args);
      if (!found) return { type: "unknown_project", attempted: args };
      return {
        type: "list",
        projectId: found.id,
        projectName: found.name,
      };
    }

    case "doing":
      return { type: "doing" };

    case "move": {
      const [idPart, statusPart] = args.split(/\s+/);
      const taskId = parsePositiveId(idPart);
      const status = statusPart?.toLowerCase();
      if (
        taskId === null ||
        !status ||
        !(MOVABLE_STATUSES as readonly string[]).includes(status)
      ) {
        return {
          type: "invalid",
          message:
            "Usage: /move <id> <backlog|todo|doing|done>",
        };
      }
      return {
        type: "move",
        taskId,
        status: status as MovableStatus,
      };
    }

    case "done": {
      const taskId = parsePositiveId(args.split(/\s+/)[0]);
      if (taskId === null) {
        return { type: "invalid", message: "Usage: /done <id>" };
      }
      return { type: "done", taskId };
    }

    case "projects":
      return { type: "projects" };

    case "newproject": {
      if (args.length === 0) {
        return {
          type: "invalid",
          message: "Usage: /newproject <name>",
        };
      }
      return { type: "newproject", name: args };
    }

    default:
      return { type: "unknown_command", command };
  }
}
