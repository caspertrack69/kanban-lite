import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import type { Client } from "@libsql/client";
import * as schema from "./schema";
import { AppError } from "@/lib/errors";

export type AppDatabase = LibSQLDatabase<typeof schema>;

export type AppTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

export type DbConnection = {
  db: AppDatabase;
  client: Client;
};

/**
 * Creates a connection and enables foreign keys for this connection.
 * Remote libSQL may manage foreign keys itself, so a rejected pragma is
 * logged instead of making the whole app unusable.
 */
export async function connectDb(
  url: string,
  authToken?: string,
): Promise<DbConnection> {
  const client = createClient({ url, authToken });

  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch (error) {
    console.warn(
      "[db] Could not enable foreign_keys for this connection. Explicit child deletes still protect data.",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    db: drizzle(client, { schema }),
    client,
  };
}

function readDatabaseConfig() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new AppError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "Database is not configured. Set DATABASE_URL.",
    );
  }

  return {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  };
}

const globalForDb = globalThis as unknown as {
  kanbanLiteDb?: Promise<DbConnection>;
};

/**
 * Lazy singleton so the app can build without secrets. Never connect at
 * module load; call this from inside a request handler.
 */
export function getDb(): Promise<DbConnection> {
  if (!globalForDb.kanbanLiteDb) {
    const config = readDatabaseConfig();
    globalForDb.kanbanLiteDb = connectDb(config.url, config.authToken).catch(
      (error) => {
        globalForDb.kanbanLiteDb = undefined;
        throw error;
      },
    );
  }

  return globalForDb.kanbanLiteDb;
}

export function asExecutor(tx: AppTransaction): AppDatabase {
  // libSQL transactions expose the same query builder surface as the database
  // handle. This cast keeps reusable read helpers usable inside transactions.
  return tx as unknown as AppDatabase;
}
