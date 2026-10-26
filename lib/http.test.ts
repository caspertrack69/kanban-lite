import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError, errorToResponse } from "./errors";
import { isSameOrigin } from "./http";

describe("same-origin checks", () => {
  it("accepts an exact origin match", () => {
    expect(
      isSameOrigin("http://localhost:3000", "http://localhost:3000/api/tasks"),
    ).toBe(true);
    expect(
      isSameOrigin("https://kanban.example.com", "https://kanban.example.com/p/1"),
    ).toBe(true);
  });

  it("rejects missing, malformed, and different origins", () => {
    expect(isSameOrigin(null, "http://localhost:3000/api/tasks")).toBe(false);
    expect(isSameOrigin("not a url", "http://localhost:3000/api/tasks")).toBe(false);
    expect(
      isSameOrigin("http://localhost:4000", "http://localhost:3000/api/tasks"),
    ).toBe(false);
    expect(
      isSameOrigin("http://kanban.example.com", "https://kanban.example.com/api"),
    ).toBe(false);
  });
});

describe("error mapping", () => {
  it("maps AppError to its status and code", async () => {
    const response = errorToResponse(
      new AppError(409, "DOING_LIMIT_REACHED", "Doing is full (3/3)."),
    );
    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { code: "DOING_LIMIT_REACHED", message: "Doing is full (3/3)." },
    });
  });

  it("maps Zod errors to 400", async () => {
    const schema = z.object({ title: z.string().min(1, "Title is required.") });
    const result = schema.safeParse({ title: "" });
    if (result.success) throw new Error("Expected validation failure");
    const response = errorToResponse(result.error);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Title is required." },
    });
  });

  it("hides unknown error details and logs them", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = errorToResponse(new Error("secret stack detail"));
    expect(response.status).toBe(500);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("secret stack detail");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
