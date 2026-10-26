import { assertMutationOrigin, handleApi, jsonResponse } from "@/lib/http";
import { destroySession } from "@/lib/session";

export async function POST(request: Request) {
  return handleApi(async () => {
    assertMutationOrigin(request);
    await destroySession();
    return jsonResponse({ authenticated: false });
  });
}
