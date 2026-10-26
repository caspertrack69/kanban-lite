"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  ListChecks,
} from "lucide-react";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProjectChip, TagChip } from "@/components/ui/tag-chip";
import { ACCENT_COLOR } from "@/lib/design-tokens.generated";
import type { TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { messageForError } from "@/lib/errors";
import { formatCardDate } from "@/lib/format";
import { useUpdateTask } from "@/lib/hooks";
import { subtaskProgress } from "@/lib/task-tree";
import type { TaskDTO } from "@/lib/types";
import { useSubtaskCollapse } from "@/lib/use-subtask-collapse";
import { useTaskUI } from "@/components/tasks/task-ui-provider";

function SubtaskPreview({
  task,
  interactive,
}: {
  task: TaskDTO;
  interactive: boolean;
}) {
  const { expanded, toggle } = useSubtaskCollapse(task.id);
  const updateTask = useUpdateTask();
  const { openTask } = useTaskUI();
  const progress = subtaskProgress(task.subtasks);

  if (progress.total === 0) return null;

  const header = (
    <>
      <ListChecks
        aria-hidden="true"
        className="size-3.5 shrink-0 text-kl-text-muted"
        strokeWidth={1.5}
      />
      <span className="text-kl-meta text-kl-text-secondary">Subtasks</span>
      <span className="text-kl-meta text-kl-text-muted">
        ({progress.label})
      </span>
      {interactive ? (
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "ml-auto size-3.5 shrink-0 text-kl-text-muted transition-transform duration-[var(--kl-duration-fast)]",
            expanded && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );

  return (
    <div className="space-y-2">
      {interactive ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          className="flex w-full items-center gap-1.5 rounded-kl-xs text-left transition-colors hover:text-kl-text"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center gap-1.5">{header}</div>
      )}

      <ProgressBar
        value={progress.done}
        max={progress.total}
        label={`${progress.label} subtasks complete`}
      />

      {expanded && interactive ? (
        <ul className="space-y-1 pt-0.5">
          {task.subtasks.map((subtask) => {
            const done = subtask.doneAt !== null;
            return (
              <li key={subtask.id} className="flex items-start gap-2">
                <span className="mt-0.5">
                  <Checkbox
                    checked={done}
                    label={`Mark ${subtask.title} ${done ? "incomplete" : "complete"}`}
                    onCheckedChange={(checked) =>
                      updateTask.mutate({
                        id: subtask.id,
                        input: { completed: checked },
                      })
                    }
                  />
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openTask(subtask.id);
                  }}
                  className={cn(
                    "min-w-0 flex-1 truncate rounded-kl-xs text-left text-kl-meta transition-colors",
                    done
                      ? "text-kl-text-disabled line-through"
                      : "text-kl-text-secondary hover:text-kl-text",
                  )}
                >
                  {subtask.title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {updateTask.isError ? (
        <p className="text-kl-meta text-kl-danger" role="alert">
          {messageForError(updateTask.error)}
        </p>
      ) : null}
    </div>
  );
}

export function TaskCardBody({
  task,
  actions,
  dragHandle,
  interactive = true,
}: {
  task: TaskDTO;
  actions?: ReactNode;
  dragHandle?: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-kl-card border border-[var(--kl-card-border)] bg-kl-card p-4",
        interactive &&
          "transition-colors duration-[var(--kl-duration-fast)] hover:bg-white/[0.03]",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-[3px] rounded-r-kl-full"
        style={{
          backgroundColor: task.project?.color ?? "var(--kl-border-divider)",
        }}
      />

      {dragHandle}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 pr-12 sm:pr-9">
          <div className="min-w-0">
            {task.project ? (
              <ProjectChip project={task.project} />
            ) : task.status === "inbox" ? (
              <TagChip color={ACCENT_COLOR}>Inbox</TagChip>
            ) : null}
          </div>
          <time
            className="shrink-0 text-kl-meta text-kl-text-muted"
            dateTime={new Date(task.doneAt ?? task.updatedAt).toISOString()}
          >
            {formatCardDate(task)}
          </time>
        </div>

        <h3 className="truncate text-kl-card-title-m tracking-kl-title text-kl-text md:text-kl-card-title">
          {task.title}
        </h3>

        {task.note ? (
          <p className="line-clamp-2 text-kl-body-m text-kl-text-secondary md:text-kl-body">
            {task.note}
          </p>
        ) : null}

        <SubtaskPreview task={task} interactive={interactive} />
      </div>

      {actions ? (
        <div
          className="mt-3 border-t border-kl-divider pt-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function TaskCard({
  task,
  status,
  actions,
}: {
  task: TaskDTO;
  status: TaskStatus;
  actions?: ReactNode;
}) {
  const { openTask } = useTaskUI();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status, task },
  });

  return (
    <article
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onClick={() => openTask(task.id)}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          openTask(task.id);
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn(
        "group relative cursor-pointer rounded-kl-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kl-border-focus)]",
        isDragging && "opacity-40",
      )}
    >
      <TaskCardBody
        task={task}
        actions={actions}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag task: ${task.title}`}
            onClick={(event) => event.stopPropagation()}
            className="absolute right-1.5 top-1.5 z-10 flex size-11 touch-none items-center justify-center rounded-kl-sm text-kl-text-disabled transition-colors hover:bg-white/5 hover:text-kl-text-muted focus-visible:bg-white/5 focus-visible:text-kl-text-muted sm:size-8 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
          >
            <GripVertical
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.5}
            />
          </button>
        }
      />
    </article>
  );
}

export function TaskCardPreview({ task }: { task: TaskDTO }) {
  return (
    <div className="rotate-[var(--kl-drag-rotate)] scale-[var(--kl-drag-scale)] rounded-kl-card shadow-kl-drag">
      <TaskCardBody task={task} interactive={false} />
    </div>
  );
}
