import { eq, inArray } from "drizzle-orm";
import { asExecutor, type AppDatabase } from "../client";
import { project, task } from "../schema";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/schemas";
import type {
  CreateProjectInput,
  ProjectDTO,
  UpdateProjectInput,
} from "@/lib/types";
import { AppError } from "@/lib/errors";
import {
  findProjectByName,
  findProjectByNameExcluding,
  getProject,
  listProjects,
  nextProjectColor,
} from "../queries/projects";

function isUniqueConstraintError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);
  return (
    message.includes("unique constraint failed") ||
    message.includes("sqlite_constraint_unique")
  );
}

function projectNameTaken(): AppError {
  return new AppError(
    409,
    "PROJECT_NAME_TAKEN",
    "A project with this name already exists.",
  );
}

export async function listProjectsService(
  db: AppDatabase,
): Promise<ProjectDTO[]> {
  return listProjects(db);
}

export async function createProject(
  db: AppDatabase,
  input: CreateProjectInput,
  now: number = Date.now(),
): Promise<ProjectDTO> {
  const parsed = createProjectSchema.parse(input);

  if (await findProjectByName(db, parsed.name)) {
    throw projectNameTaken();
  }

  try {
    const [row] = await db
      .insert(project)
      .values({
        name: parsed.name,
        color: parsed.color,
        createdAt: now,
      })
      .returning();

    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt,
      taskCount: 0,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) throw projectNameTaken();
    throw error;
  }
}

export async function createProjectWithNextColor(
  db: AppDatabase,
  name: string,
  now: number = Date.now(),
): Promise<ProjectDTO> {
  const color = await nextProjectColor(db);
  return createProject(db, { name, color }, now);
}

export async function updateProject(
  db: AppDatabase,
  id: number,
  input: UpdateProjectInput,
): Promise<ProjectDTO> {
  const parsed = updateProjectSchema.parse(input);
  const current = await getProject(db, id);
  if (!current) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  if (parsed.name !== undefined) {
    const duplicate = await findProjectByNameExcluding(db, parsed.name, id);
    if (duplicate) throw projectNameTaken();
  }

  try {
    await db
      .update(project)
      .set({
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.color !== undefined ? { color: parsed.color } : {}),
      })
      .where(eq(project.id, id));
  } catch (error) {
    if (isUniqueConstraintError(error)) throw projectNameTaken();
    throw error;
  }

  const updated = await getProject(db, id);
  if (!updated) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }
  return updated;
}

export async function deleteProject(
  db: AppDatabase,
  id: number,
): Promise<{ deletedTaskCount: number }> {
  return db.transaction(async (transaction) => {
    const tx = asExecutor(transaction);
    const current = await tx
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, id))
      .limit(1);
    if (!current[0]) {
      throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
    }

    const projectTasks = await tx
      .select({ id: task.id })
      .from(task)
      .where(eq(task.projectId, id));
    const projectTaskIds = projectTasks.map((row) => row.id);

    const childTasks =
      projectTaskIds.length > 0
        ? await tx
            .select({ id: task.id })
            .from(task)
            .where(inArray(task.parentId, projectTaskIds))
        : [];

    const allIds = Array.from(
      new Set([...projectTaskIds, ...childTasks.map((row) => row.id)]),
    );

    if (allIds.length > 0) {
      await tx.delete(task).where(inArray(task.id, allIds));
    }
    await tx.delete(project).where(eq(project.id, id));

    return { deletedTaskCount: allIds.length };
  });
}
