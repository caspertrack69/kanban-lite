import { z } from "zod";
import {
  BOARD_STATUSES,
  MAX_NOTE_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  MOVABLE_STATUSES,
  PROJECT_COLORS,
  TASK_STATUSES,
  TASK_VIEWS,
} from "./constants";

const positiveId = z.number().int().positive();

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const boardStatusSchema = z.enum(BOARD_STATUSES);
export const movableStatusSchema = z.enum(MOVABLE_STATUSES);
export const projectColorSchema = z.enum(PROJECT_COLORS);
export const taskViewSchema = z.enum(TASK_VIEWS);

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);

export const noteSchema = z
  .string()
  .trim()
  .max(MAX_NOTE_LENGTH, `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`);

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required.")
  .max(
    MAX_PROJECT_NAME_LENGTH,
    `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer.`,
  );

export const createTaskSchema = z.object({
  title: titleSchema,
  note: noteSchema.optional().nullable(),
  status: taskStatusSchema.optional(),
  projectId: positiveId.optional().nullable(),
  parentId: positiveId.optional().nullable(),
  beforeId: positiveId.optional().nullable(),
  afterId: positiveId.optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  note: noteSchema.optional().nullable(),
  status: taskStatusSchema.optional(),
  projectId: positiveId.optional().nullable(),
  parentId: positiveId.optional().nullable(),
  beforeId: positiveId.optional().nullable(),
  afterId: positiveId.optional().nullable(),
  completed: z.boolean().optional(),
});

export const createProjectSchema = z.object({
  name: projectNameSchema,
  color: projectColorSchema,
});

export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  color: projectColorSchema.optional(),
});

export const doingLimitSchema = z.coerce
  .number()
  .int("Doing limit must be a whole number.")
  .min(1, "Doing limit must be at least 1.");

export const updateSettingsSchema = z.object({
  doingLimit: doingLimitSchema,
});

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
});

export const tasksQuerySchema = z.discriminatedUnion("view", [
  z.object({ view: z.literal("board") }),
  z.object({ view: z.literal("inbox") }),
  z.object({
    view: z.literal("backlog"),
    projectId: z.coerce.number().int().positive("A project is required."),
  }),
]);

export type CreateTaskSchemaInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskSchemaInput = z.infer<typeof updateTaskSchema>;
export type CreateProjectSchemaInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectSchemaInput = z.infer<typeof updateProjectSchema>;
