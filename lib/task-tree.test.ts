import { describe, expect, it } from "vitest";
import {
  attachSubtasks,
  buildTaskTree,
  flattenTaskTree,
  subtaskProgress,
} from "./task-tree";
import type { TaskDTO } from "./types";

function task(
  id: number,
  position: string,
  overrides: Partial<TaskDTO> = {},
): TaskDTO {
  return {
    id,
    projectId: 1,
    parentId: null,
    title: `Task ${id}`,
    note: null,
    status: "backlog",
    position,
    createdAt: 1,
    updatedAt: 1,
    doneAt: null,
    project: { id: 1, name: "Project", color: "#8C72DB" },
    subtasks: [],
    ...overrides,
  };
}

describe("task tree", () => {
  it("attaches and sorts subtasks by position", () => {
    const parents = [task(1, "a0")];
    const subtasks = [
      task(3, "a2", { parentId: 1, status: null }),
      task(2, "a1", { parentId: 1, status: null }),
    ];

    const result = attachSubtasks(parents, subtasks);
    expect(result).toHaveLength(1);
    expect(result[0].subtasks.map((subtask) => subtask.id)).toEqual([2, 3]);
  });

  it("counts progress from doneAt", () => {
    const subtasks = [
      task(2, "a1", { parentId: 1, status: null, doneAt: 10 }),
      task(3, "a2", { parentId: 1, status: null }),
    ];
    expect(subtaskProgress(subtasks)).toEqual({
      done: 1,
      total: 2,
      label: "1/2",
    });
  });

  it("keeps orphans and second-level rows at the root", () => {
    const tree = buildTaskTree([
      task(1, "a0"),
      task(2, "a1", { parentId: 1, status: null }),
      task(3, "a2", { parentId: 99, status: null }),
      task(4, "a3", { parentId: 2, status: null }),
    ]);

    expect(tree.map((item) => item.id)).toEqual([1, 3, 4]);
    expect(tree[0].subtasks.map((item) => item.id)).toEqual([2]);
    expect(tree[0].subtasks[0].subtasks).toEqual([]);
  });

  it("flattens only one level", () => {
    const tree = buildTaskTree([
      task(1, "a0"),
      task(2, "a1", { parentId: 1, status: null }),
    ]);
    expect(flattenTaskTree(tree).map((item) => item.id)).toEqual([1, 2]);
  });
});
