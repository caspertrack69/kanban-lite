import {
  assertMutationOrigin,
  handleApi,
  jsonResponse,
  parseJsonBody,
} from "@/lib/http";
import { AppError } from "@/lib/errors";
import { passwordMatches } from "@/lib/password";
import { loginSchema } from "@/lib/schemas";
import { createSession, readAppPassword } from "@/lib/session";

export async function POST(request: Request) {
  return handleApi(async () => {
    assertMutationOrigin(request);
    const expected = readAppPassword();
    const { password } = await parseJsonBody(request, loginSchema);

    if (!passwordMatches(password, expected)) {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Incorrect password. Try again.",
      );
    }

    await createSession();
    return jsonResponse({ authenticated: true });
  });
}
