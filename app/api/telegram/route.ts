import { NextRequest } from "next/server";
import {
  assertTelegramWebhookSecret,
  getTelegramWebhookHandler,
} from "@/lib/telegram/bot";
import { handleApi } from "@/lib/http";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    assertTelegramWebhookSecret(request);
    const handler = await getTelegramWebhookHandler();
    const response = await handler(request);
    if (!response) {
      return new Response("ok", {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  });
}
