CREATE TABLE `project` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_name_ci_unique` ON `project` (lower("name"));--> statement-breakpoint
CREATE TABLE `setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`parent_id` integer,
	`title` text NOT NULL,
	`note` text,
	`status` text,
	`position` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`done_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `task`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_status_valid" CHECK("task"."status" IS NULL OR "task"."status" IN ('inbox','backlog','todo','doing','done')),
	CONSTRAINT "task_status_parent_consistency" CHECK(("task"."parent_id" IS NULL AND "task"."status" IS NOT NULL) OR ("task"."parent_id" IS NOT NULL AND "task"."status" IS NULL)),
	CONSTRAINT "task_project_consistency" CHECK("task"."status" IS NULL OR ("task"."status" = 'inbox' AND "task"."project_id" IS NULL) OR ("task"."status" <> 'inbox' AND "task"."project_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `task_status_position_idx` ON `task` (`status`,`position`);--> statement-breakpoint
CREATE INDEX `task_project_status_idx` ON `task` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `task_parent_idx` ON `task` (`parent_id`);--> statement-breakpoint
CREATE INDEX `task_parent_position_idx` ON `task` (`parent_id`,`position`);--> statement-breakpoint
CREATE INDEX `task_status_done_at_idx` ON `task` (`status`,`done_at`);