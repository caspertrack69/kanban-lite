import type { TaskDTO } from "./types";
import { sortByPosition } from "./ordering";

function cloneTask(task: TaskDTO): TaskDTO {
  return { ...task, subtasks: [] };
}

/**
 * Attaches pre-fetched subtasks to their parents, preserving one level.
 * Parent order is left untouched because callers query it already sorted.
 */
export function attachSubtasks(
  parents: TaskDTO[],
  subtasks: TaskDTO[],
): TaskDTO[] {
  const byId = new Map<number, TaskDTO>();
  const result = parents.map((parent) => {
    const clone = cloneTask(parent);
    byId.set(clone.id, clone);
    return clone;
  });

  for (const subtask of sortByPosition(subtasks)) {
    const parent = subtask.parentId === null ? undefined : byId.get(subtask.parentId);
    if (!parent) continue;
    parent.subtasks.push({ ...subtask, subtasks: [] });
  }

  return result;
}

/**
 * Builds a one-level tree from a flat list. Orphans and invalid second-level
 * rows are kept at the root instead of being silently dropped.
 */
export function buildTaskTree(tasks: TaskDTO[]): TaskDTO[] {
  const cloned = tasks.map(cloneTask);
  const byId = new Map(cloned.map((task) => [task.id, task]));
  const roots: TaskDTO[] = [];

  for (const task of cloned) {
    const parent =
      task.parentId === null ? undefined : byId.get(task.parentId);

    if (
      parent &&
      parent.id !== task.id &&
      parent.parentId === null
    ) {
      parent.subtasks.push(task);
    } else {
      roots.push(task);
    }
  }

  const sortedRoots = sortByPosition(roots);
  for (const root of sortedRoots) {
    root.subtasks = sortByPosition(root.subtasks);
  }

  return sortedRoots;
}

export function subtaskProgress(subtasks: TaskDTO[]): {
  done: number;
  total: number;
  label: string;
} {
  const total = subtasks.length;
  const done = subtasks.filter((subtask) => subtask.doneAt !== null).length;
  return { done, total, label: `${done}/${total}` };
}

export function flattenTaskTree(tasks: TaskDTO[]): TaskDTO[] {
  return tasks.flatMap((task) => [task, ...task.subtasks]);
}
