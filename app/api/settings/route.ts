import { NextRequest, connection } from "next/server";
import { getDb } from "@/db/client";
import {
  getSettingsData,
  setDoingLimit,
} from "@/db/queries/settings";
import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { updateSettingsSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";

export async function GET() {
  await connection();
  return handleApi(async () => {
    await requireSession();
    const { db } = await getDb();
    return jsonResponse(await getSettingsData(db));
  });
}

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    await requireSession();
    assertMutationOrigin(request);
    const { doingLimit } = await parseJsonBody(
      request,
      updateSettingsSchema,
    );
    const { db } = await getDb();
    await setDoingLimit(db, doingLimit);
    return jsonResponse(await getSettingsData(db));
  });
}
