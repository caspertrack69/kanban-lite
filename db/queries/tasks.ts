import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { AppDatabase } from "../client";
import type { BoardStatus } from "@/lib/constants";
import type { BoardData, TaskDTO } from "@/lib/types";
import type { TaskScope } from "@/lib/ordering";
import { attachSubtasks } from "@/lib/task-tree";
import { doneCutoff } from "@/lib/format";
import { task } from "../schema";
import {
  listSubtasksForParents,
  selectTaskRow,
  selectTasks,
  taskOrder,
  toTaskDTO,
} from "./shared";

async function nest(
  db: AppDatabase,
  parents: TaskDTO[],
): Promise<TaskDTO[]> {
  const subtasks = await listSubtasksForParents(
    db,
    parents.map((parent) => parent.id),
  );
  return attachSubtasks(parents, subtasks);
}

export async function listBoardTasks(
  db: AppDatabase,
  now: number,
): Promise<Omit<BoardData, "doingLimit">> {
  const cutoff = doneCutoff(now);

  const rows = await selectTasks(db)
    .where(
      and(
        isNull(task.parentId),
        or(
          inArray(task.status, ["todo", "doing"]),
          and(eq(task.status, "done"), gte(task.doneAt, cutoff)),
        ),
      ),
    )
    .orderBy(...taskOrder);

  const tasks = await nest(db, rows.map(toTaskDTO));
  const columns: Record<BoardStatus, TaskDTO[]> = {
    todo: [],
    doing: [],
    done: [],
  };

  for (const item of tasks) {
    if (item.status === "todo" || item.status === "doing" || item.status === "done") {
      columns[item.status].push(item);
    }
  }

  return { columns, doneSince: cutoff };
}

export async function listInboxTasks(db: AppDatabase): Promise<TaskDTO[]> {
  const rows = await selectTasks(db)
    .where(and(isNull(task.parentId), eq(task.status, "inbox")))
    .orderBy(...taskOrder);
  return nest(db, rows.map(toTaskDTO));
}

export async function listBacklogTasks(
  db: AppDatabase,
  projectId: number,
): Promise<TaskDTO[]> {
  const rows = await selectTasks(db)
    .where(
      and(
        isNull(task.parentId),
        eq(task.status, "backlog"),
        eq(task.projectId, projectId),
      ),
    )
    .orderBy(...taskOrder);
  return nest(db, rows.map(toTaskDTO));
}

export async function listTelegramTasks(
  db: AppDatabase,
  projectId?: number,
): Promise<TaskDTO[]> {
  const conditions = [
    isNull(task.parentId),
    inArray(task.status, ["backlog", "todo"]),
  ];
  if (projectId !== undefined) {
    conditions.push(eq(task.projectId, projectId));
  }

  const rows = await selectTasks(db)
    .where(and(...conditions))
    .orderBy(asc(task.status), ...taskOrder);

  return nest(db, rows.map(toTaskDTO));
}

export async function listDoingTasks(db: AppDatabase): Promise<TaskDTO[]> {
  const rows = await selectTasks(db)
    .where(and(isNull(task.parentId), eq(task.status, "doing")))
    .orderBy(...taskOrder);
  return nest(db, rows.map(toTaskDTO));
}

export async function getTaskDetail(
  db: AppDatabase,
  id: number,
): Promise<TaskDTO | undefined> {
  const row = await selectTaskRow(db, id);
  if (!row) return undefined;

  const rows = await selectTasks(db).where(eq(task.id, id)).limit(1);
  const parent = rows[0];
  if (!parent) return undefined;

  const dto = toTaskDTO(parent);
  if (dto.parentId !== null) return dto;

  const subtasks = await listSubtasksForParents(db, [dto.id]);
  return attachSubtasks([dto], subtasks)[0];
}

export async function listScopePositions(
  db: AppDatabase,
  scope: TaskScope,
): Promise<Array<{ id: number; position: string }>> {
  let condition;
  switch (scope.kind) {
    case "subtask":
      condition = eq(task.parentId, scope.parentId);
      break;
    case "inbox":
      condition = and(isNull(task.parentId), eq(task.status, "inbox"));
      break;
    case "backlog":
      condition = and(
        isNull(task.parentId),
        eq(task.status, "backlog"),
        eq(task.projectId, scope.projectId),
      );
      break;
    case "board":
      condition = and(
        isNull(task.parentId),
        eq(task.status, scope.status),
      );
      break;
  }

  return db
    .select({ id: task.id, position: task.position })
    .from(task)
    .where(condition)
    .orderBy(...taskOrder);
}

export async function countDoingParents(db: AppDatabase): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(task)
    .where(and(isNull(task.parentId), eq(task.status, "doing")));
  return row?.count ?? 0;
}
