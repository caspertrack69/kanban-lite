import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const project = sqliteTable(
  "project",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("project_name_ci_unique").on(sql`lower(${table.name})`),
  ],
);

export const task = sqliteTable(
  "task",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    parentId: integer("parent_id").references(
      (): AnySQLiteColumn => task.id,
      { onDelete: "cascade" },
    ),
    title: text("title").notNull(),
    note: text("note"),
    status: text("status"),
    position: text("position").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    doneAt: integer("done_at"),
  },
  (table) => [
    check(
      "task_status_valid",
      sql`${table.status} IS NULL OR ${table.status} IN ('inbox','backlog','todo','doing','done')`,
    ),
    check(
      "task_status_parent_consistency",
      sql`(${table.parentId} IS NULL AND ${table.status} IS NOT NULL) OR (${table.parentId} IS NOT NULL AND ${table.status} IS NULL)`,
    ),
    check(
      "task_project_consistency",
      sql`${table.status} IS NULL OR (${table.status} = 'inbox' AND ${table.projectId} IS NULL) OR (${table.status} <> 'inbox' AND ${table.projectId} IS NOT NULL)`,
    ),
    index("task_status_position_idx").on(table.status, table.position),
    index("task_project_status_idx").on(table.projectId, table.status),
    index("task_parent_idx").on(table.parentId),
    index("task_parent_position_idx").on(table.parentId, table.position),
    index("task_status_done_at_idx").on(table.status, table.doneAt),
  ],
);

export const setting = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type ProjectRow = typeof project.$inferSelect;
export type TaskRow = typeof task.$inferSelect;
export type SettingRow = typeof setting.$inferSelect;
