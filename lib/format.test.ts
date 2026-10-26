import { describe, expect, it } from "vitest";
import {
  doneCutoff,
  formatCardDate,
  formatDoingCount,
  formatProgress,
  formatRelativeDate,
  formatShortDate,
  hexToRgba,
  isWithinDoneWindow,
} from "./format";

const NOW = Date.UTC(2026, 1, 20, 12, 0, 0);

describe("date formatting", () => {
  it("formats recent dates relative to today", () => {
    expect(
      formatRelativeDate(NOW, { now: NOW, timeZone: "UTC" }),
    ).toBe("Today");
    expect(
      formatRelativeDate(NOW - 86_400_000, { now: NOW, timeZone: "UTC" }),
    ).toBe("Yesterday");
    expect(
      formatRelativeDate(NOW - 2 * 86_400_000, { now: NOW, timeZone: "UTC" }),
    ).toBe("2 days ago");
  });

  it("uses a short date for older items", () => {
    expect(
      formatShortDate(Date.UTC(2026, 1, 19), {
        timeZone: "UTC",
        locale: "en-GB",
      }),
    ).toBe("19 Feb");
    expect(
      formatRelativeDate(Date.UTC(2026, 1, 1), {
        now: NOW,
        timeZone: "UTC",
      }),
    ).toBe("1 Feb");
    expect(
      formatRelativeDate(Date.UTC(2026, 1, 19), {
        now: Date.UTC(2026, 2, 1),
        timeZone: "UTC",
      }),
    ).toBe("19 Feb");
  });

  it("uses doneAt before updatedAt for cards", () => {
    expect(
      formatCardDate(
        { doneAt: NOW, updatedAt: NOW - 10 * 86_400_000 },
        { now: NOW, timeZone: "UTC" },
      ),
    ).toBe("Today");
  });

  it("computes the seven day done window", () => {
    expect(doneCutoff(NOW)).toBe(NOW - 7 * 86_400_000);
    expect(isWithinDoneWindow(NOW - 6 * 86_400_000, NOW)).toBe(true);
    expect(isWithinDoneWindow(NOW - 8 * 86_400_000, NOW)).toBe(false);
    expect(isWithinDoneWindow(null, NOW)).toBe(false);
  });
});

describe("format helpers", () => {
  it("formats counts and progress", () => {
    expect(formatProgress(2, 5)).toBe("2/5");
    expect(formatDoingCount(2, 3)).toBe("2/3");
  });

  it("converts palette hex colors to tinted backgrounds", () => {
    expect(hexToRgba("#8C72DB", 0.16)).toBe("rgba(140,114,219,0.16)");
    expect(hexToRgba("#fff", 0.5)).toBe("rgba(255,255,255,0.5)");
    expect(hexToRgba("nope", 0.5)).toBe("rgba(255,255,255,0.5)");
  });
});
