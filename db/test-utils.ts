import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";
import * as schema from "./schema";
import type { AppDatabase } from "./client";

export type TestDatabase = {
  db: AppDatabase;
  client: Client;
  close: () => void;
};

export async function createTestDatabase(): Promise<TestDatabase> {
  const client = createClient({ url: ":memory:" });
  await client.execute("PRAGMA foreign_keys = ON");
  const db = drizzle(client, { schema });
  await migrate(db, {
    migrationsFolder: resolve(process.cwd(), "db/migrations"),
  });

  return {
    db,
    client,
    close: () => client.close(),
  };
}
