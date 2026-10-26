import { eq, inArray } from "drizzle-orm";
import { asExecutor, type AppDatabase } from "../client";
import { task } from "../schema";
import { getDoingLimit } from "../queries/settings";
import {
  countDoingParents,
  getTaskDetail,
  listBoardTasks,
} from "../queries/tasks";
import { selectTaskRow } from "../queries/shared";
import { getProject } from "../queries/projects";
import { createTaskSchema, updateTaskSchema } from "@/lib/schemas";
import type { TaskStatus } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { scopeForTask, sameScope } from "@/lib/ordering";
import type {
  BoardData,
  CreateTaskInput,
  TaskDTO,
  UpdateTaskInput,
} from "@/lib/types";
import { resolvePosition } from "./position";

function emptyToNull(value: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function assertDoingCapacity(db: AppDatabase): Promise<void> {
  const limit = await getDoingLimit(db);
  const count = await countDoingParents(db);

  if (count >= limit) {
    throw new AppError(
      409,
      "DOING_LIMIT_REACHED",
      `Doing is full (${count}/${limit}).`,
    );
  }
}

async function requireTask(db: AppDatabase, id: number) {
  const current = await selectTaskRow(db, id);
  if (!current) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found.");
  }
  return current;
}

async function requireProject(db: AppDatabase, projectId: number): Promise<void> {
  const found = await getProject(db, projectId);
  if (!found) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }
}

async function requireDetail(
  db: AppDatabase,
  id: number,
): Promise<TaskDTO> {
  const detail = await getTaskDetail(db, id);
  if (!detail) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found.");
  }
  return detail;
}

export async function getBoardData(
  db: AppDatabase,
  now: number = Date.now(),
): Promise<BoardData> {
  const [board, doingLimit] = await Promise.all([
    listBoardTasks(db, now),
    getDoingLimit(db),
  ]);
  return { ...board, doingLimit };
}

export async function createTask(
  db: AppDatabase,
  input: CreateTaskInput,
  now: number = Date.now(),
): Promise<TaskDTO> {
  const parsed = createTaskSchema.parse(input);

  return db.transaction(async (transaction) => {
    const tx = asExecutor(transaction);
    const note = parsed.note === undefined ? null : emptyToNull(parsed.note);

    if (parsed.parentId != null) {
      const parent = await requireTask(tx, parsed.parentId);
      if (parent.parentId !== null) {
        throw new AppError(
          400,
          "SUBTASK_DEPTH_EXCEEDED",
          "Sub-tasks can only be one level deep.",
        );
      }

      const scope = { kind: "subtask" as const, parentId: parent.id };
      const position = await resolvePosition(tx, scope, {
        beforeId: parsed.beforeId,
        afterId: parsed.afterId,
      });

      const [row] = await tx
        .insert(task)
        .values({
          projectId: parent.projectId,
          parentId: parent.id,
          title: parsed.title,
          note,
          status: null,
          position,
          createdAt: now,
          updatedAt: now,
          doneAt: null,
        })
        .returning();

      return requireDetail(tx, row.id);
    }

    if (parsed.status === undefined) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Status is required for a top-level task.",
      );
    }

    let projectId = parsed.projectId ?? null;
    if (parsed.status === "inbox") {
      projectId = null;
    } else {
      if (projectId === null) {
        throw new AppError(
          400,
          "PROJECT_REQUIRED",
          "Choose a project before moving this task out of Inbox.",
        );
      }
      await requireProject(tx, projectId);
      if (parsed.status === "doing") {
        await assertDoingCapacity(tx);
      }
    }

    const scope = scopeForTask({
      parentId: null,
      status: parsed.status,
      projectId,
    });
    const position = await resolvePosition(tx, scope, {
      beforeId: parsed.beforeId,
      afterId: parsed.afterId,
    });

    const [row] = await tx
      .insert(task)
      .values({
        projectId,
        parentId: null,
        title: parsed.title,
        note,
        status: parsed.status,
        position,
        createdAt: now,
        updatedAt: now,
        doneAt: parsed.status === "done" ? now : null,
      })
      .returning();

    return requireDetail(tx, row.id);
  });
}

export async function updateTask(
  db: AppDatabase,
  id: number,
  input: UpdateTaskInput,
  now: number = Date.now(),
): Promise<TaskDTO> {
  const parsed = updateTaskSchema.parse(input);

  return db.transaction(async (transaction) => {
    const tx = asExecutor(transaction);
    const current = await requireTask(tx, id);

    if (current.parentId !== null) {
      if (
        parsed.status !== undefined ||
        parsed.projectId !== undefined ||
        parsed.parentId !== undefined ||
        parsed.beforeId != null ||
        parsed.afterId != null
      ) {
        throw new AppError(
          400,
          "SUBTASK_STATUS_LOCKED",
          "Sub-tasks follow their parent. Only the title, note, and completion can change.",
        );
      }

      const doneAt =
        parsed.completed === undefined
          ? current.doneAt
          : parsed.completed
            ? (current.doneAt ?? now)
            : null;

      await tx
        .update(task)
        .set({
          title: parsed.title ?? current.title,
          note:
            parsed.note === undefined
              ? current.note
              : emptyToNull(parsed.note),
          doneAt,
          updatedAt: now,
        })
        .where(eq(task.id, id));

      return requireDetail(tx, id);
    }

    if (parsed.completed !== undefined) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Completed is only valid for sub-tasks.",
      );
    }

    if (parsed.parentId !== undefined) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Reparenting tasks is not supported.",
      );
    }

    let nextStatus = (parsed.status ?? current.status) as TaskStatus;
    let nextProjectId =
      parsed.projectId !== undefined ? parsed.projectId : current.projectId;

    if (
      current.status === "inbox" &&
      parsed.status === undefined &&
      parsed.projectId != null
    ) {
      nextStatus = "backlog";
    }

    if (nextStatus === "inbox") {
      nextProjectId = null;
    } else if (nextProjectId === null) {
      throw new AppError(
        400,
        "PROJECT_REQUIRED",
        "Choose a project before moving this task out of Inbox.",
      );
    } else {
      await requireProject(tx, nextProjectId);
    }

    if (parsed.status === "doing" && current.status !== "doing") {
      await assertDoingCapacity(tx);
    }

    const currentScope = scopeForTask({
      parentId: null,
      status: current.status as TaskStatus,
      projectId: current.projectId,
    });
    const nextScope = scopeForTask({
      parentId: null,
      status: nextStatus,
      projectId: nextProjectId,
    });

    const shouldReposition =
      !sameScope(currentScope, nextScope) ||
      parsed.beforeId != null ||
      parsed.afterId != null;

    let position = current.position;
    if (shouldReposition) {
      position = await resolvePosition(tx, nextScope, {
        beforeId: parsed.beforeId,
        afterId: parsed.afterId,
        movingId: id,
      });
    }

    const doneAt =
      nextStatus === "done"
        ? current.status === "done"
          ? current.doneAt
          : now
        : null;

    await tx
      .update(task)
      .set({
        title: parsed.title ?? current.title,
        note:
          parsed.note === undefined ? current.note : emptyToNull(parsed.note),
        status: nextStatus,
        projectId: nextProjectId,
        position,
        doneAt,
        updatedAt: now,
      })
      .where(eq(task.id, id));

    if (nextProjectId !== current.projectId) {
      await tx
        .update(task)
        .set({ projectId: nextProjectId, updatedAt: now })
        .where(eq(task.parentId, id));
    }

    return requireDetail(tx, id);
  });
}

export async function deleteTask(
  db: AppDatabase,
  id: number,
): Promise<{ deletedSubtaskCount: number }> {
  return db.transaction(async (transaction) => {
    const tx = asExecutor(transaction);
    await requireTask(tx, id);

    const children = await tx
      .select({ id: task.id })
      .from(task)
      .where(eq(task.parentId, id));

    if (children.length > 0) {
      await tx
        .delete(task)
        .where(inArray(task.id, children.map((row) => row.id)));
    }
    await tx.delete(task).where(eq(task.id, id));

    return { deletedSubtaskCount: children.length };
  });
}
