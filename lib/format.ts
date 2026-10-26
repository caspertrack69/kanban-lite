import { DONE_WINDOW_DAYS } from "./constants";

const DAY_MS = 86_400_000;

export type DateFormatOptions = {
  now?: number;
  timeZone?: string;
  locale?: string;
};

function dayNumber(timestamp: number, timeZone?: string): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(timestamp);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function formatShortDate(
  timestamp: number,
  options: Pick<DateFormatOptions, "timeZone" | "locale"> = {},
): string {
  return new Intl.DateTimeFormat(options.locale ?? "en-GB", {
    timeZone: options.timeZone,
    day: "numeric",
    month: "short",
  }).format(timestamp);
}

export function formatRelativeDate(
  timestamp: number | null,
  options: DateFormatOptions = {},
): string {
  if (timestamp === null) return "";

  const now = options.now ?? Date.now();
  const difference = dayNumber(now, options.timeZone) - dayNumber(timestamp, options.timeZone);

  if (difference <= 0) return "Today";
  if (difference === 1) return "Yesterday";
  if (difference < 7) return `${difference} days ago`;
  return formatShortDate(timestamp, options);
}

export function formatCardDate(
  task: { doneAt: number | null; updatedAt: number },
  options: DateFormatOptions = {},
): string {
  return formatRelativeDate(task.doneAt ?? task.updatedAt, options);
}

export function doneCutoff(now: number, days = DONE_WINDOW_DAYS): number {
  return now - days * DAY_MS;
}

export function isWithinDoneWindow(
  doneAt: number | null,
  now: number,
  days = DONE_WINDOW_DAYS,
): boolean {
  return doneAt !== null && doneAt >= doneCutoff(now, days);
}

export function formatProgress(done: number, total: number): string {
  return `${done}/${total}`;
}

export function formatDoingCount(count: number, limit: number): string {
  return `${count}/${limit}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `rgba(255,255,255,${alpha})`;
  }

  const value = Number.parseInt(expanded, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
}
