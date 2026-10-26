import { describe, expect, it } from "vitest";
import { moveTaskInBoard, reorderTasks } from "./optimistic";
import type { BoardData, TaskDTO } from "./types";

function task(
  id: number,
  status: "todo" | "doing" | "done",
  position: string,
): TaskDTO {
  return {
    id,
    projectId: 1,
    parentId: null,
    title: `Task ${id}`,
    note: null,
    status,
    position,
    createdAt: 1,
    updatedAt: 1,
    doneAt: status === "done" ? 5 : null,
    project: { id: 1, name: "Project", color: "#8C72DB" },
    subtasks: [],
  };
}

function board(): BoardData {
  return {
    doingLimit: 3,
    doneSince: 0,
    columns: {
      todo: [task(1, "todo", "a0"), task(2, "todo", "a1"), task(3, "todo", "a2")],
      doing: [task(4, "doing", "a0")],
      done: [task(5, "done", "a0")],
    },
  };
}

describe("optimistic board moves", () => {
  it("moves within a column by neighbor id", () => {
    const before = board();
    const after = moveTaskInBoard(before, 1, "todo", { beforeId: 2 }, 100);

    expect(after.columns.todo.map((item) => item.id)).toEqual([2, 1, 3]);
    expect(before.columns.todo.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("moves across columns and updates status and doneAt", () => {
    const before = board();
    const after = moveTaskInBoard(before, 1, "doing", { afterId: 4 }, 100);

    expect(after.columns.todo.map((item) => item.id)).toEqual([2, 3]);
    expect(after.columns.doing.map((item) => item.id)).toEqual([1, 4]);
    expect(after.columns.doing[0].status).toBe("doing");
    expect(after.columns.doing[0].doneAt).toBeNull();
    expect(before.columns.todo).toHaveLength(3);
  });

  it("sets doneAt when entering done and clears it when leaving", () => {
    const done = moveTaskInBoard(board(), 1, "done", {}, 1_000);
    expect(done.columns.done.find((item) => item.id === 1)?.doneAt).toBe(1_000);

    const reopened = moveTaskInBoard(done, 1, "todo", {}, 2_000);
    expect(reopened.columns.todo.find((item) => item.id === 1)?.doneAt).toBeNull();
  });

  it("preserves doneAt when moving inside done", () => {
    const done = board();
    const next = moveTaskInBoard(done, 5, "done", {}, 2_000);
    expect(next.columns.done[0].doneAt).toBe(5);
  });

  it("reorders a list immutably", () => {
    const before = board().columns.todo;
    const after = reorderTasks(before, 3, { afterId: 1 }, 2_000);

    expect(after.map((item) => item.id)).toEqual([3, 1, 2]);
    expect(before.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(after.find((item) => item.id === 3)?.updatedAt).toBe(2_000);
  });

  it("keeps an untouched snapshot for rollback", () => {
    const snapshot = board();
    const serialized = JSON.stringify(snapshot);
    const optimistic = moveTaskInBoard(snapshot, 1, "doing", { afterId: 4 }, 100);

    expect(JSON.stringify(snapshot)).toBe(serialized);
    expect(snapshot.columns.todo.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(snapshot.columns.doing.map((item) => item.id)).toEqual([4]);
    expect(optimistic.columns.todo.map((item) => item.id)).toEqual([2, 3]);
    expect(optimistic.columns.doing.map((item) => item.id)).toEqual([1, 4]);
  });

  it("falls back to appending for an unknown neighbor", () => {
    const after = reorderTasks(board().columns.todo, 1, { beforeId: 999 });
    expect(after.map((item) => item.id)).toEqual([2, 3, 1]);
  });
});
