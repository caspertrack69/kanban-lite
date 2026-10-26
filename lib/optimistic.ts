import type { BoardStatus } from "./constants";
import type { BoardData, TaskDTO } from "./types";

export type TaskPlacement = {
  beforeId?: number | null;
  afterId?: number | null;
};

function insertAtPlacement(
  tasks: TaskDTO[],
  moving: TaskDTO,
  placement: TaskPlacement,
): TaskDTO[] {
  const without = tasks.filter((task) => task.id !== moving.id);

  let index = without.length;
  if (placement.beforeId != null) {
    const before = without.findIndex((task) => task.id === placement.beforeId);
    if (before !== -1) index = before + 1;
  } else if (placement.afterId != null) {
    const after = without.findIndex((task) => task.id === placement.afterId);
    if (after !== -1) index = after;
  }

  return [...without.slice(0, index), moving, ...without.slice(index)];
}

export function moveTaskInBoard(
  board: BoardData,
  taskId: number,
  targetStatus: BoardStatus,
  placement: TaskPlacement,
  now: number = Date.now(),
): BoardData {
  const sourceStatus = (
    ["todo", "doing", "done"] as const
  ).find((status) => board.columns[status].some((task) => task.id === taskId));
  if (!sourceStatus) return board;

  const moving = board.columns[sourceStatus].find((task) => task.id === taskId);
  if (!moving) return board;

  const columns = {
    todo: board.columns.todo.filter((task) => task.id !== taskId),
    doing: board.columns.doing.filter((task) => task.id !== taskId),
    done: board.columns.done.filter((task) => task.id !== taskId),
  };

  const nextTask: TaskDTO = {
    ...moving,
    status: targetStatus,
    doneAt:
      targetStatus === "done"
        ? moving.status === "done"
          ? moving.doneAt
          : now
        : null,
    updatedAt: now,
  };

  columns[targetStatus] = insertAtPlacement(
    columns[targetStatus],
    nextTask,
    placement,
  );

  return { ...board, columns };
}

export function reorderTasks(
  tasks: TaskDTO[],
  taskId: number,
  placement: TaskPlacement,
  now: number = Date.now(),
): TaskDTO[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;

  return insertAtPlacement(
    tasks,
    { ...moving, updatedAt: now },
    placement,
  );
}
