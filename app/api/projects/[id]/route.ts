import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import {
  deleteProject,
  updateProject,
} from "@/db/services/projects";
import { AppError } from "@/lib/errors";
import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { updateProjectSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

function projectId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/projects/[id]">,
) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const { id } = await context.params;
    const input = await parseJsonBody(request, updateProjectSchema);
    const { db } = await getDb();
    const project = await updateProject(db, projectId(id), input);
    return jsonResponse(project);
  });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/projects/[id]">,
) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const { id } = await context.params;
    const { db } = await getDb();
    const result = await deleteProject(db, projectId(id));
    return jsonResponse(result);
  });
}
