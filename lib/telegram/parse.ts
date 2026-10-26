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
  | { type: "unknown_project"; attempted: string; suggestions: string[] }
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

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[b.length];
}

/**
 * Ranks projects that look close to what the owner typed so a failed command
 * can suggest a correction instead of only listing everything.
 */
export function suggestProjectNames(
  projects: TelegramProject[],
  attempted: string,
  limit = 3,
): string[] {
  const attempt = normalizeForMatch(attempted);
  if (attempt.length === 0) return [];

  const attemptTokens = [...attempt.split(" ")].filter(
    (token) => token.length >= 2,
  );

  const scored = projects
    .map((project) => {
      const name = normalizeForMatch(project.name);
      if (name.length === 0) return { name: project.name, score: 0 };

      let score = 0;

      for (const token of name.split(" ")) {
        if (attemptTokens.includes(token)) {
          score += 3;
        } else if (
          token.length >= 3 &&
          attemptTokens.some(
            (candidate) =>
              candidate.startsWith(token) || candidate.includes(token),
          )
        ) {
          score += 1;
        }
      }

      const head = attempt.slice(0, name.length).trim();
      if (head.length >= 3) {
        const similarity =
          1 - levenshtein(name, head) / Math.max(name.length, head.length);
        if (similarity >= 0.7) score += 2;
      }

      return { name: project.name, score };
    })
    .filter((entry) => entry.score >= 2);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.name);
}

const NUMERIC_REFERENCE_PATTERN = /^(\d+)(?:\s+([\s\S]*))?$/;

/**
 * Resolves `/add` input that starts with a project, where the project can be
 * either a 1-based number from /projects or the longest matching name prefix.
 */
function resolveProjectReference(
  projects: TelegramProject[],
  input: string,
): { project: TelegramProject; remainder: string } | null {
  const numeric = input.match(NUMERIC_REFERENCE_PATTERN);
  if (numeric) {
    const index = Number(numeric[1]);
    if (index >= 1 && index <= projects.length) {
      return {
        project: projects[index - 1],
        remainder: (numeric[2] ?? "").trim(),
      };
    }
  }

  return matchLongestProjectPrefix(projects, input);
}

function findProjectByReference(
  projects: TelegramProject[],
  input: string,
): TelegramProject | undefined {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed);
    return index >= 1 && index <= projects.length
      ? projects[index - 1]
      : undefined;
  }
  return findProjectByName(projects, trimmed);
}

function unknownProject(
  projects: TelegramProject[],
  attempted: string,
): ParsedTelegramMessage {
  return {
    type: "unknown_project",
    attempted,
    suggestions: suggestProjectNames(projects, attempted),
  };
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
          message:
            "Usage: /add <project> <title>\nUse a project name or its number from /projects, for example: /add 1 Fix login",
        };
      }

      const found = resolveProjectReference(projects, args);
      if (!found) {
        return unknownProject(projects, args);
      }
      if (found.remainder.length === 0) {
        return {
          type: "invalid",
          message: `Add a title after the project, for example: /add ${found.project.name} Fix login`,
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
      const found = findProjectByReference(projects, args);
      if (!found) return unknownProject(projects, args);
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
            "Usage: /move <id> <backlog|todo|doing|done>\nFind ids with /list or /doing, for example: /move 12 doing",
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
        return {
          type: "invalid",
          message:
            "Usage: /done <id>\nFind ids with /list or /doing, for example: /done 12",
        };
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
