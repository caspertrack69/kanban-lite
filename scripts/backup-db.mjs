#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

if (!url) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  const [projects, tasks, settings] = await Promise.all([
    client.execute(
      "SELECT id, name, color, created_at AS createdAt FROM project ORDER BY id",
    ),
    client.execute(
      "SELECT id, project_id AS projectId, parent_id AS parentId, title, note, status, position, created_at AS createdAt, updated_at AS updatedAt, done_at AS doneAt FROM task ORDER BY id",
    ),
    client.execute(
      "SELECT key, value, updated_at AS updatedAt FROM setting ORDER BY key",
    ),
  ]);

  const exportedAt = new Date();
  const backup = {
    format: "kanban-lite-backup",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    counts: {
      projects: projects.rows.length,
      tasks: tasks.rows.length,
      settings: settings.rows.length,
    },
    projects: projects.rows,
    tasks: tasks.rows,
    settings: settings.rows,
  };

  const stamp = exportedAt
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const directory = resolve(process.cwd(), "backups");
  const file = resolve(directory, `kanban-${stamp}.json`);

  await mkdir(directory, { recursive: true });
  await writeFile(file, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

  console.log(`Backup written to ${file}`);
  console.log(
    `Exported ${backup.counts.projects} projects, ${backup.counts.tasks} tasks, ${backup.counts.settings} settings.`,
  );
} catch (error) {
  console.error(
    "Backup failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
} finally {
  client.close();
}
