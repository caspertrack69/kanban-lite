"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BOARD_COLUMN_LABELS, type BoardStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { ProjectDTO, TaskDTO } from "@/lib/types";
import { StatusLabel } from "@/components/ui/status-label";
import { QuickAdd } from "./quick-add";
import { TaskCard } from "./task-card";

export function BoardColumn({
  status,
  tasks,
  projects,
  defaultProjectId,
  doingCount,
  doingLimit,
}: {
  status: BoardStatus;
  tasks: TaskDTO[];
  projects: ProjectDTO[];
  defaultProjectId: number | null;
  doingCount: number;
  doingLimit: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  const count = status === "doing" ? `${doingCount}/${doingLimit}` : tasks.length;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${BOARD_COLUMN_LABELS[status]} column`}
      className={cn(
        "flex min-h-[220px] w-full shrink-0 flex-col gap-3 rounded-kl-card p-1 transition-colors duration-[var(--kl-duration-fast)] md:w-[var(--kl-column)]",
        isOver && "bg-white/[0.02]",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-1 pt-2">
        <StatusLabel
          status={status}
          label={BOARD_COLUMN_LABELS[status]}
          count={count}
        />
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-[var(--kl-space-card-gap)]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} status={status} />
          ))}

          {isOver ? (
            <div
              aria-hidden="true"
              className="h-16 rounded-kl-card bg-[var(--kl-drop-placeholder)]"
            />
          ) : null}
        </div>
      </SortableContext>

      <QuickAdd
        status={status}
        projects={projects}
        defaultProjectId={defaultProjectId}
        doingCount={doingCount}
        doingLimit={doingLimit}
      />
    </section>
  );
}
