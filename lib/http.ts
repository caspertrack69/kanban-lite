import type { ZodType } from "zod";
import { errorToResponse } from "./errors";
import { AppError } from "./errors";

export function isSameOrigin(
  origin: string | null,
  requestUrl: string,
): boolean {
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function assertMutationOrigin(request: Request): void {
  if (!isSameOrigin(request.headers.get("origin"), request.url)) {
    throw new AppError(
      403,
      "INVALID_ORIGIN",
      "Cross-origin mutations are not allowed.",
    );
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON.",
    );
  }

  return schema.parse(body);
}

export async function handleApi(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return errorToResponse(error);
  }
}
