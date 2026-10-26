import { afterEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertTelegramWebhookSecret } from "./bot";

const previousSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  } else {
    process.env.TELEGRAM_WEBHOOK_SECRET = previousSecret;
  }
});

function request(secret?: string): Request {
  const headers = new Headers();
  if (secret !== undefined) {
    headers.set("x-telegram-bot-api-secret-token", secret);
  }
  return new Request("http://localhost/api/telegram", {
    method: "POST",
    headers,
  });
}

function expectAppError(
  action: () => void,
  status: number,
  code: string,
) {
  try {
    action();
    throw new Error("Expected an AppError");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(status);
    expect((error as AppError).code).toBe(code);
  }
}

describe("telegram webhook secret", () => {
  it("accepts the matching header", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret-value";
    expect(() =>
      assertTelegramWebhookSecret(request("webhook-secret-value")),
    ).not.toThrow();
  });

  it("rejects a missing or wrong header with 401", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "webhook-secret-value";

    expectAppError(
      () => assertTelegramWebhookSecret(request()),
      401,
      "UNAUTHENTICATED",
    );
    expectAppError(
      () => assertTelegramWebhookSecret(request("wrong")),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("returns 503 when the secret is not configured", () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expectAppError(
      () => assertTelegramWebhookSecret(request("anything")),
      503,
      "MISCONFIGURED",
    );
  });
});
