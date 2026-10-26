import { asc, eq } from "drizzle-orm";
import type { AppDatabase } from "../client";
import { setting } from "../schema";
import { DEFAULT_DOING_LIMIT } from "@/lib/constants";
import { doingLimitSchema } from "@/lib/schemas";
import type { SettingsData } from "@/lib/types";
import { countDoingParents } from "./tasks";

export const DOING_LIMIT_KEY = "doing_limit";

export async function getSetting(
  db: AppDatabase,
  key: string,
): Promise<{ key: string; value: string; updatedAt: number } | undefined> {
  const rows = await db
    .select({ key: setting.key, value: setting.value, updatedAt: setting.updatedAt })
    .from(setting)
    .where(eq(setting.key, key))
    .orderBy(asc(setting.key))
    .limit(1);
  return rows[0];
}

export async function getDoingLimit(
  db: AppDatabase,
  envValue: string | undefined = process.env.DOING_LIMIT,
): Promise<number> {
  const stored = await getSetting(db, DOING_LIMIT_KEY);
  if (stored) {
    const parsed = doingLimitSchema.safeParse(stored.value);
    if (parsed.success) return parsed.data;
    console.warn(
      `[settings] Ignoring invalid stored ${DOING_LIMIT_KEY} value: ${stored.value}`,
    );
  }

  if (envValue !== undefined && envValue.trim() !== "") {
    const parsed = doingLimitSchema.safeParse(envValue);
    if (parsed.success) return parsed.data;
    console.warn(
      `[settings] Ignoring invalid DOING_LIMIT value: ${envValue}. Falling back to ${DEFAULT_DOING_LIMIT}.`,
    );
  }

  return DEFAULT_DOING_LIMIT;
}

export async function setDoingLimit(
  db: AppDatabase,
  limit: number,
  now: number = Date.now(),
): Promise<number> {
  const value = doingLimitSchema.parse(limit);
  await db
    .insert(setting)
    .values({
      key: DOING_LIMIT_KEY,
      value: String(value),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: setting.key,
      set: { value: String(value), updatedAt: now },
    });
  return value;
}

export async function getSettingsData(
  db: AppDatabase,
  envValue: string | undefined = process.env.DOING_LIMIT,
): Promise<SettingsData> {
  const [doingLimit, doingCount] = await Promise.all([
    getDoingLimit(db, envValue),
    countDoingParents(db),
  ]);
  return { doingLimit, doingCount };
}
