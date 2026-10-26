import { NextRequest, connection } from "next/server";
import { getDb } from "@/db/client";
import { createProject, listProjectsService } from "@/db/services/projects";
import { createProjectSchema } from "@/lib/schemas";
import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { requireSession } from "@/lib/session";

export async function GET() {
  await connection();
  return handleApi(async () => {
    await requireSession();
    const { db } = await getDb();
    const projects = await listProjectsService(db);
    return jsonResponse({ projects });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const input = await parseJsonBody(request, createProjectSchema);
    const { db } = await getDb();
    const project = await createProject(db, input);
    return jsonResponse(project, 201);
  });
}
