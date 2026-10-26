import { describe, expect, it } from "vitest";
import {
  appendPosition,
  placementForIndex,
  positionBetween,
  positionForPlacement,
  sameScope,
  scopeForTask,
  scopeKey,
} from "./ordering";
import { AppError } from "./errors";

describe("ordering", () => {
  it("generates first, appended, prepended and between keys", () => {
    const first = appendPosition(null);
    expect(first.length).toBeGreaterThan(0);

    const last = appendPosition("a2");
    expect(last > "a2").toBe(true);

    const before = positionForPlacement([{ id: 1, position: "a0" }], null, null, 1);
    expect(before < "a0").toBe(true);

    const between = positionForPlacement(
      [
        { id: 1, position: "a0" },
        { id: 2, position: "a1" },
      ],
      null,
      1,
      2,
    );
    expect(between > "a0").toBe(true);
    expect(between < "a1").toBe(true);
  });

  it("appends when no neighbors are given", () => {
    const position = positionForPlacement(
      [
        { id: 1, position: "a0" },
        { id: 2, position: "a2" },
      ],
      null,
      null,
      null,
    );
    expect(position > "a2").toBe(true);
  });

  it("rejects invalid neighbors", () => {
    expect(() =>
      positionForPlacement([{ id: 1, position: "a0" }], null, 99, null),
    ).toThrowError(AppError);

    try {
      positionForPlacement([{ id: 1, position: "a0" }], null, 1, 1);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("CONFLICT");
    }
  });

  it("rejects positioning relative to itself", () => {
    expect(() =>
      positionForPlacement([{ id: 1, position: "a0" }], 1, 1, null),
    ).toThrowError(AppError);
  });

  it("rejects reversed bounds", () => {
    expect(() =>
      positionBetween("a2", "a1"),
    ).toThrowError(AppError);
  });

  it("models scope changes across board, backlog and projects", () => {
    const backlog = scopeForTask({
      parentId: null,
      status: "backlog",
      projectId: 2,
    });
    const todo = scopeForTask({
      parentId: null,
      status: "todo",
      projectId: 2,
    });

    expect(scopeKey(backlog)).toBe("backlog:2");
    expect(scopeKey(todo)).toBe("board:todo");
    expect(sameScope(backlog, todo)).toBe(false);

    expect(
      scopeKey(
        scopeForTask({ parentId: null, status: "inbox", projectId: null }),
      ),
    ).toBe("inbox");
    expect(
      scopeKey(
        scopeForTask({ parentId: 7, status: null, projectId: 2 }),
      ),
    ).toBe("subtask:7");
  });

  it("requires a project for backlog tasks", () => {
    expect(() =>
      scopeForTask({ parentId: null, status: "backlog", projectId: null }),
    ).toThrowError(AppError);
  });

  it("computes placement neighbors by id", () => {
    const tasks = [
      { id: 1, position: "a0" },
      { id: 2, position: "a1" },
      { id: 3, position: "a2" },
    ];

    expect(placementForIndex(tasks, 0, 2)).toEqual({
      beforeId: null,
      afterId: 1,
    });
    expect(placementForIndex(tasks, 2, 2)).toEqual({
      beforeId: 3,
      afterId: null,
    });
    expect(placementForIndex(tasks, 99, 2)).toEqual({
      beforeId: 3,
      afterId: null,
    });
  });
});
