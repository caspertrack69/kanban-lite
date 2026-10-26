#!/usr/bin/env node
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const deleteWebhook = process.argv.includes("--delete");
const baseUrl = process.argv[2] ?? process.env.APP_URL?.trim();

if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}

if (!deleteWebhook) {
  if (!secret) {
    console.error("Missing TELEGRAM_WEBHOOK_SECRET.");
    process.exit(1);
  }
  if (!baseUrl) {
    console.error("Missing APP_URL or a base URL argument.");
    process.exit(1);
  }
  if (!baseUrl.startsWith("https://")) {
    console.error(
      "Telegram webhooks require a public HTTPS URL. Pass https://<host> or set APP_URL.",
    );
    process.exit(1);
  }
}

const endpoint = `https://api.telegram.org/bot${token}/${
  deleteWebhook ? "deleteWebhook" : "setWebhook"
}`;

const body = deleteWebhook
  ? { drop_pending_updates: false }
  : {
      url: `${baseUrl.replace(/\/+$/, "")}/api/telegram`,
      secret_token: secret,
      allowed_updates: ["message"],
    };

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const payload = await response.json().catch(() => null);

if (!response.ok || !payload?.ok) {
  console.error(
    `Telegram API rejected the request (${response.status}):`,
    payload?.description ?? "unknown error",
  );
  process.exit(1);
}

if (deleteWebhook) {
  console.log("Telegram webhook deleted.");
} else {
  console.log(`Telegram webhook set to ${body.url}`);
}
