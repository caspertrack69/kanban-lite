import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { AppDatabase } from "../client";
import { project, task } from "../schema";
import { PROJECT_COLORS } from "@/lib/design-tokens.generated";
import type { ProjectDTO } from "@/lib/types";

export async function listProjects(db: AppDatabase): Promise<ProjectDTO[]> {
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      taskCount: sql<number>`count(${task.id})`.mapWith(Number),
    })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .groupBy(project.id, project.name, project.color, project.createdAt)
    .orderBy(asc(project.createdAt), asc(project.id));

  return rows;
}

export async function getProject(
  db: AppDatabase,
  id: number,
): Promise<ProjectDTO | undefined> {
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      taskCount: sql<number>`count(${task.id})`.mapWith(Number),
    })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(eq(project.id, id))
    .groupBy(project.id, project.name, project.color, project.createdAt)
    .limit(1);
  return rows[0];
}

export async function findProjectByName(
  db: AppDatabase,
  name: string,
): Promise<ProjectDTO | undefined> {
  const normalized = name.trim().toLowerCase();
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      taskCount: sql<number>`count(${task.id})`.mapWith(Number),
    })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(sql`lower(${project.name}) = ${normalized}`)
    .groupBy(project.id, project.name, project.color, project.createdAt)
    .limit(1);
  return rows[0];
}

export async function findProjectByNameExcluding(
  db: AppDatabase,
  name: string,
  excludeId: number,
): Promise<ProjectDTO | undefined> {
  const normalized = name.trim().toLowerCase();
  const rows = await db
    .select({
      id: project.id,
      name: project.name,
      color: project.color,
      createdAt: project.createdAt,
      taskCount: sql<number>`count(${task.id})`.mapWith(Number),
    })
    .from(project)
    .leftJoin(task, eq(task.projectId, project.id))
    .where(
      and(
        sql`lower(${project.name}) = ${normalized}`,
        ne(project.id, excludeId),
      ),
    )
    .groupBy(project.id, project.name, project.color, project.createdAt)
    .limit(1);
  return rows[0];
}

export async function listProjectRows(db: AppDatabase) {
  return db.select().from(project).orderBy(asc(project.createdAt), asc(project.id));
}

export async function nextProjectColor(db: AppDatabase): Promise<string> {
  const rows = await listProjectRows(db);
  return PROJECT_COLORS[rows.length % PROJECT_COLORS.length];
}
