import { NextRequest, connection } from "next/server";
import { getDb } from "@/db/client";
import {
  listBacklogTasks,
  listInboxTasks,
} from "@/db/queries/tasks";
import { createTask, getBoardData } from "@/db/services/tasks";
import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { createTaskSchema, tasksQuerySchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  await connection();
  return handleApi(async () => {
    await requireSession();
    const query = tasksQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const { db } = await getDb();

    if (query.view === "board") {
      return jsonResponse(await getBoardData(db));
    }

    if (query.view === "inbox") {
      return jsonResponse({ tasks: await listInboxTasks(db) });
    }

    return jsonResponse({
      tasks: await listBacklogTasks(db, query.projectId),
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const input = await parseJsonBody(request, createTaskSchema);
    const { db } = await getDb();
    const task = await createTask(db, input);
    return jsonResponse(task, 201);
  });
}
