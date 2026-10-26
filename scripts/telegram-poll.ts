#!/usr/bin/env node
import { config } from "dotenv";
import type { Bot } from "grammy";

config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    console.error("Missing TELEGRAM_BOT_TOKEN. Set it in .env.local.");
    process.exit(1);
  }

  const { createTelegramBot } = await import("@/lib/telegram/bot");

  let bot: Bot;
  try {
    bot = createTelegramBot();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const stop = () => {
    void bot.stop();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log("[telegram] Long polling locally. Ctrl+C to stop.");
  console.log("[telegram] This deletes any registered webhook first.");

  await bot.start({
    drop_pending_updates: true,
    onStart: (info) => {
      console.log(`[telegram] Connected as @${info.username}.`);
    },
  });

  console.log("[telegram] Stopped.");
}

main().catch((error) => {
  console.error("[telegram] Polling failed:", error);
  process.exit(1);
});
