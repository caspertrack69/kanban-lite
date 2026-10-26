import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "../client";
import { project, task } from "../schema";
import type { TaskStatus } from "@/lib/constants";
import type { TaskDTO } from "@/lib/types";

export const taskWithProjectSelection = {
  id: task.id,
  projectId: task.projectId,
  parentId: task.parentId,
  title: task.title,
  note: task.note,
  status: task.status,
  position: task.position,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  doneAt: task.doneAt,
  projectName: project.name,
  projectColor: project.color,
};

export type TaskWithProjectRow = {
  id: number;
  projectId: number | null;
  parentId: number | null;
  title: string;
  note: string | null;
  status: string | null;
  position: string;
  createdAt: number;
  updatedAt: number;
  doneAt: number | null;
  projectName: string | null;
  projectColor: string | null;
};

export function selectTasks(db: AppDatabase) {
  return db
    .select(taskWithProjectSelection)
    .from(task)
    .leftJoin(project, eq(project.id, task.projectId));
}

export function toTaskDTO(row: TaskWithProjectRow): TaskDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    parentId: row.parentId,
    title: row.title,
    note: row.note,
    status: row.status as TaskStatus | null,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doneAt: row.doneAt,
    project:
      row.projectId !== null &&
      row.projectName !== null &&
      row.projectColor !== null
        ? {
            id: row.projectId,
            name: row.projectName,
            color: row.projectColor,
          }
        : null,
    subtasks: [],
  };
}

export const taskOrder = [asc(task.position), asc(task.id)];

export async function listSubtasksForParents(
  db: AppDatabase,
  parentIds: number[],
): Promise<TaskDTO[]> {
  if (parentIds.length === 0) return [];
  const rows = await selectTasks(db)
    .where(and(inArray(task.parentId, parentIds)))
    .orderBy(asc(task.parentId), ...taskOrder);
  return rows.map(toTaskDTO);
}

export async function selectTaskRow(db: AppDatabase, id: number) {
  const rows = await db.select().from(task).where(eq(task.id, id)).limit(1);
  return rows[0];
}
