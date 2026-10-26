import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOING_LIMIT,
  PROJECT_COLORS,
  SESSION_COOKIE_NAME,
  STATUS_LABELS,
  TASK_STATUSES,
} from "./constants";

describe("constants", () => {
  it("defines the five task statuses in flow order", () => {
    expect(TASK_STATUSES).toEqual([
      "inbox",
      "backlog",
      "todo",
      "doing",
      "done",
    ]);
    expect(STATUS_LABELS.todo).toBe("To Do");
  });

  it("uses four unique palette project colors", () => {
    expect(PROJECT_COLORS).toHaveLength(4);
    expect(new Set(PROJECT_COLORS).size).toBe(4);
  });

  it("ships sane defaults", () => {
    expect(DEFAULT_DOING_LIMIT).toBe(3);
    expect(SESSION_COOKIE_NAME).toBe("kl_session");
  });
});
