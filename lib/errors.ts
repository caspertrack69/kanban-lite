import { ZodError } from "zod";

export type ErrorCode =
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "INVALID_ORIGIN"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PROJECT_NAME_TAKEN"
  | "PROJECT_REQUIRED"
  | "DOING_LIMIT_REACHED"
  | "SUBTASK_STATUS_LOCKED"
  | "SUBTASK_DEPTH_EXCEEDED"
  | "TASK_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "MISCONFIGURED"
  | "DATABASE_NOT_CONFIGURED";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function messageForError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "The request is invalid.";
  }
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function errorToResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonError(error.status, error.code, error.message);
  }

  if (error instanceof ZodError) {
    const message =
      error.issues[0]?.message ?? "The request is invalid.";
    return jsonError(400, "VALIDATION_ERROR", message);
  }

  console.error("[api] Unhandled error", error);
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Please try again.",
  );
}
