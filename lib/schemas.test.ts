import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  createTaskSchema,
  doingLimitSchema,
  noteSchema,
  projectColorSchema,
  tasksQuerySchema,
  titleSchema,
  updateTaskSchema,
} from "./schemas";
import { PROJECT_COLORS } from "./design-tokens.generated";

describe("schemas", () => {
  it("trims titles and enforces the 200 character limit", () => {
    expect(titleSchema.parse("  Ship it  ")).toBe("Ship it");
    expect(() => titleSchema.parse("   ")).toThrow();
    expect(() => titleSchema.parse("x".repeat(201))).toThrow();
    expect(titleSchema.parse("x".repeat(200))).toHaveLength(200);
  });

  it("enforces note length and trimming", () => {
    expect(noteSchema.parse("  hello  ")).toBe("hello");
    expect(() => noteSchema.parse("x".repeat(2_001))).toThrow();
    expect(noteSchema.parse("")).toBe("");
  });

  it("validates task status and project name", () => {
    expect(createTaskSchema.parse({ title: "Task", status: "todo" }).status).toBe(
      "todo",
    );
    expect(() =>
      createTaskSchema.parse({ title: "Task", status: "nope" }),
    ).toThrow();
    expect(
      createProjectSchema.parse({
        name: "  Kanban Lite  ",
        color: PROJECT_COLORS[0],
      }).name,
    ).toBe("Kanban Lite");
    expect(() =>
      createProjectSchema.parse({ name: "x".repeat(61), color: PROJECT_COLORS[0] }),
    ).toThrow();
    expect(() => projectColorSchema.parse("#000000")).toThrow();
  });

  it("validates doing limits", () => {
    expect(doingLimitSchema.parse("4")).toBe(4);
    expect(doingLimitSchema.parse(1)).toBe(1);
    expect(() => doingLimitSchema.parse(0)).toThrow();
    expect(() => doingLimitSchema.parse("not-a-number")).toThrow();
  });

  it("rejects invalid update payloads", () => {
    expect(() =>
      updateTaskSchema.parse({ completed: "yes" }),
    ).toThrow();
    expect(updateTaskSchema.parse({ completed: true })).toEqual({
      completed: true,
    });
  });

  it("requires a project for the backlog view", () => {
    expect(tasksQuerySchema.parse({ view: "board" })).toEqual({
      view: "board",
    });
    expect(() => tasksQuerySchema.parse({ view: "backlog" })).toThrow();
    expect(
      tasksQuerySchema.parse({ view: "backlog", projectId: "3" }),
    ).toEqual({ view: "backlog", projectId: 3 });
  });
});
