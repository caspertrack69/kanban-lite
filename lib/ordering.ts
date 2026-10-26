import { generateKeyBetween } from "fractional-indexing";
import type { BoardStatus, TaskStatus } from "./constants";
import { AppError } from "./errors";

export type TaskScope =
  | { kind: "subtask"; parentId: number }
  | { kind: "inbox" }
  | { kind: "backlog"; projectId: number }
  | { kind: "board"; status: BoardStatus };

export type PositionedTask = {
  id: number;
  position: string;
};

export function scopeForTask(task: {
  parentId: number | null;
  status: TaskStatus | null;
  projectId: number | null;
}): TaskScope {
  if (task.parentId !== null) {
    return { kind: "subtask", parentId: task.parentId };
  }

  if (task.status === null) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "A top-level task is missing its status.",
    );
  }

  if (task.status === "inbox") return { kind: "inbox" };

  if (task.status === "backlog") {
    if (task.projectId === null) {
      throw new AppError(
        400,
        "PROJECT_REQUIRED",
        "Backlog tasks need a project.",
      );
    }
    return { kind: "backlog", projectId: task.projectId };
  }

  return { kind: "board", status: task.status };
}

export function scopeKey(scope: TaskScope): string {
  switch (scope.kind) {
    case "subtask":
      return `subtask:${scope.parentId}`;
    case "inbox":
      return "inbox";
    case "backlog":
      return `backlog:${scope.projectId}`;
    case "board":
      return `board:${scope.status}`;
  }
}

export function sameScope(a: TaskScope, b: TaskScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

export function comparePositions(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function sortByPosition<T extends PositionedTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const byPosition = comparePositions(a.position, b.position);
    return byPosition !== 0 ? byPosition : a.id - b.id;
  });
}

export function appendPosition(lastPosition: string | null): string {
  return generateKeyBetween(lastPosition, null);
}

export function positionBetween(
  previousPosition: string | null,
  nextPosition: string | null,
): string {
  if (
    previousPosition !== null &&
    nextPosition !== null &&
    comparePositions(previousPosition, nextPosition) >= 0
  ) {
    throw new AppError(
      409,
      "CONFLICT",
      "The target order changed. Refresh and try again.",
    );
  }

  return generateKeyBetween(previousPosition, nextPosition);
}

function findIndex(tasks: PositionedTask[], id: number, label: string): number {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) {
    throw new AppError(
      409,
      "CONFLICT",
      `The ${label} task is no longer in this list. Refresh and try again.`,
    );
  }
  return index;
}

/**
 * Resolves the fractional index for a task being placed into a scope.
 * Neighbors are referenced by task ID, never by filtered view index.
 */
export function positionForPlacement(
  scopeTasks: PositionedTask[],
  movingId: number | null,
  beforeId: number | null,
  afterId: number | null,
): string {
  if (movingId !== null && (beforeId === movingId || afterId === movingId)) {
    throw new AppError(
      409,
      "CONFLICT",
      "A task cannot be positioned relative to itself.",
    );
  }

  const tasks =
    movingId === null
      ? sortByPosition(scopeTasks)
      : sortByPosition(scopeTasks.filter((task) => task.id !== movingId));

  if (beforeId !== null && afterId !== null) {
    const beforeIndex = findIndex(tasks, beforeId, "before");
    const afterIndex = findIndex(tasks, afterId, "after");
    if (beforeIndex > afterIndex) {
      throw new AppError(
        409,
        "CONFLICT",
        "The target order changed. Refresh and try again.",
      );
    }
    return positionBetween(
      tasks[beforeIndex].position,
      tasks[afterIndex].position,
    );
  }

  if (beforeId !== null) {
    const index = findIndex(tasks, beforeId, "before");
    return positionBetween(
      tasks[index].position,
      index < tasks.length - 1 ? tasks[index + 1].position : null,
    );
  }

  if (afterId !== null) {
    const index = findIndex(tasks, afterId, "after");
    return positionBetween(
      index > 0 ? tasks[index - 1].position : null,
      tasks[index].position,
    );
  }

  return appendPosition(tasks.at(-1)?.position ?? null);
}

/**
 * Optimistic helper: returns predecessor/successor IDs for inserting a moving
 * card at the target index of a rendered column.
 */
export function placementForIndex(
  tasks: PositionedTask[],
  targetIndex: number,
  movingId: number,
): { beforeId: number | null; afterId: number | null } {
  const others = tasks.filter((task) => task.id !== movingId);
  const clamped = Math.max(0, Math.min(targetIndex, others.length));
  return {
    beforeId: dataAt(others, clamped - 1),
    afterId: others[clamped]?.id ?? null,
  };
}

function dataAt(tasks: PositionedTask[], index: number): number | null {
  return index >= 0 && index < tasks.length ? tasks[index].id : null;
}
