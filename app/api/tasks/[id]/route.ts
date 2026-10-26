import { NextRequest, connection } from "next/server";
import { getDb } from "@/db/client";
import { getTaskDetail } from "@/db/queries/tasks";
import { deleteTask, updateTask } from "@/db/services/tasks";
import { AppError } from "@/lib/errors";
import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { updateTaskSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

function taskId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found.");
  }
  return id;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/tasks/[id]">,
) {
  await connection();
  return handleApi(async () => {
    await requireSession();
    const { id } = await context.params;
    const { db } = await getDb();
    const task = await getTaskDetail(db, taskId(id));
    if (!task) {
      throw new AppError(404, "TASK_NOT_FOUND", "Task not found.");
    }
    return jsonResponse(task);
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/tasks/[id]">,
) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const { id } = await context.params;
    const input = await parseJsonBody(request, updateTaskSchema);
    const { db } = await getDb();
    const task = await updateTask(db, taskId(id), input);
    return jsonResponse(task);
  });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/tasks/[id]">,
) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const { id } = await context.params;
    const { db } = await getDb();
    const result = await deleteTask(db, taskId(id));
    return jsonResponse(result);
  });
}
