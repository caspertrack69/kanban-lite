"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { TextLink } from "@/components/ui/text-link";
import { useTaskUI } from "@/components/tasks/task-ui-provider";
import {
  BOARD_COLUMN_LABELS,
  BOARD_STATUSES,
  type BoardStatus,
} from "@/lib/constants";
import { cn } from "@/lib/cn";
import { messageForError } from "@/lib/errors";
import { useBoard, useProjects, useUpdateTask } from "@/lib/hooks";
import { moveTaskInBoard } from "@/lib/optimistic";
import { queryKeys } from "@/lib/query-keys";
import { useMediaQuery } from "@/lib/use-media-query";
import type { BoardData, TaskDTO } from "@/lib/types";
import { BoardColumn } from "./board-column";
import { BoardFilter } from "./board-filter";
import { TaskCardPreview } from "./task-card";

function findTask(board: BoardData, id: number): TaskDTO | undefined {
  for (const status of BOARD_STATUSES) {
    const found = board.columns[status].find((task) => task.id === id);
    if (found) return found;
  }
  return undefined;
}

function findStatus(
  board: BoardData,
  id: number,
): BoardStatus | undefined {
  return BOARD_STATUSES.find((status) =>
    board.columns[status].some((task) => task.id === id),
  );
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function isBelowOver(event: DragEndEvent): boolean {
  const translated = event.active.rect.current.translated;
  const overRect = event.over?.rect;
  if (!translated || !overRect) return false;
  return (
    translated.top + translated.height / 2 >
    overRect.top + overRect.height / 2
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {BOARD_STATUSES.map((status) => (
        <div key={status} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-36 w-full rounded-kl-card" />
          <Skeleton className="h-36 w-full rounded-kl-card" />
          <Skeleton className="h-11 w-full rounded-kl-add" />
        </div>
      ))}
    </div>
  );
}

export function BoardPage() {
  const boardQuery = useBoard();
  const projects = useProjects();
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  const { openCreate } = useTaskUI();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [mobileStatus, setMobileStatus] = useState<BoardStatus>("todo");
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const board = boardQuery.data;
  const projectList = projects.data ?? [];

  const effectiveProjectId =
    activeProjectId !== null &&
    projects.data?.some((project) => project.id === activeProjectId)
      ? activeProjectId
      : null;

  const filteredColumns = useMemo(() => {
    if (!board) return null;
    const matches = (task: TaskDTO) =>
      effectiveProjectId === null || task.projectId === effectiveProjectId;
    return {
      todo: board.columns.todo.filter(matches),
      doing: board.columns.doing.filter(matches),
      done: board.columns.done.filter(matches),
    };
  }, [effectiveProjectId, board]);

  const activeTask =
    board && activeTaskId !== null ? findTask(board, activeTaskId) : undefined;


  function handleDragStart(event: DragStartEvent) {
    setError(null);
    if (!board) return;
    const id = Number(event.active.id);
    setActiveTaskId(findTask(board, id)?.id ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    if (!board || !filteredColumns || !event.over) return;

    const activeId = Number(event.active.id);
    const over = event.over;
    const overData = over.data.current as
      | { type?: string; status?: string }
      | undefined;

    const sourceStatus = findStatus(board, activeId);
    if (!sourceStatus) return;

    const targetStatus =
      overData?.type === "column" || overData?.type === "task"
        ? (overData.status as BoardStatus | undefined)
        : undefined;
    if (!targetStatus || !BOARD_STATUSES.includes(targetStatus)) return;

    const targetList = filteredColumns[targetStatus];
    const others = targetList.filter((task) => task.id !== activeId);
    let insertIndex = others.length;

    if (overData?.type === "task") {
      const overTaskId = Number(over.id);
      if (overTaskId === activeId) return;

      const overIndex = targetList.findIndex((task) => task.id === overTaskId);
      if (overIndex === -1) return;

      if (sourceStatus === targetStatus) {
        insertIndex = overIndex;
      } else {
        insertIndex = isBelowOver(event) ? overIndex + 1 : overIndex;
      }
    }

    insertIndex = Math.max(0, Math.min(insertIndex, others.length));
    const beforeId =
      insertIndex > 0 ? others[insertIndex - 1].id : null;
    const afterId =
      insertIndex < others.length ? others[insertIndex].id : null;

    if (
      targetStatus === "doing" &&
      sourceStatus !== "doing" &&
      board.columns.doing.length >= board.doingLimit
    ) {
      setError(
        `Doing is full (${board.columns.doing.length}/${board.doingLimit}). Move a card out first.`,
      );
      return;
    }

    const optimistic = moveTaskInBoard(board, activeId, targetStatus, {
      beforeId,
      afterId,
    });

    if (
      sourceStatus === targetStatus &&
      arraysEqual(
        optimistic.columns[sourceStatus].map((task) => task.id),
        board.columns[sourceStatus].map((task) => task.id),
      )
    ) {
      return;
    }

    const snapshot = queryClient.getQueryData<BoardData>(queryKeys.board);
    if (!snapshot) return;

    void queryClient.cancelQueries({ queryKey: queryKeys.board });
    queryClient.setQueryData(queryKeys.board, optimistic);
    setError(null);

    updateTask.mutate(
      {
        id: activeId,
        input: { status: targetStatus, beforeId, afterId },
      },
      {
        onError: (mutationError) => {
          queryClient.setQueryData(queryKeys.board, snapshot);
          setError(messageForError(mutationError));
        },
      },
    );
  }

  if (boardQuery.isPending) {
    return (
      <>
        <PageHeader
          title="Board"
          section="Board"
          description="Todo, Doing, and Done across every project."
        />
        <BoardSkeleton />
      </>
    );
  }

  if (boardQuery.isError || !board || !filteredColumns) {
    return (
      <>
        <PageHeader title="Board" section="Board" />
        <InlineAlert>
          <p>{messageForError(boardQuery.error)}</p>
          <button
            type="button"
            onClick={() => void boardQuery.refetch()}
            className="mt-2 inline-flex items-center gap-1.5 font-medium underline"
          >
            <RefreshCw
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.5}
            />
            Try again
          </button>
        </InlineAlert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Board"
        section="Board"
        description="Todo, Doing, and Done across every project."
        action={
          <Button
            variant="primary"
            onClick={() =>
              openCreate({
                status: projectList.length > 0 ? "todo" : "inbox",
                projectId: effectiveProjectId,
              })
            }
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Add task</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      {projects.isPending ? (
        <Skeleton className="mb-4 h-8 w-64 rounded-kl-full" />
      ) : projects.isError ? (
        <InlineAlert className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{messageForError(projects.error)}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => void projects.refetch()}
            >
              Try again
            </button>
          </div>
        </InlineAlert>
      ) : projectList.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <BoardFilter
            projects={projectList}
            value={effectiveProjectId}
            onChange={setActiveProjectId}
          />
          <p className="text-kl-meta text-kl-text-muted">
            Done shows the last 7 days
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-kl-card border border-kl-border bg-kl-card px-4 py-3 text-kl-body text-kl-text-secondary">
          Create your first project to start using the board.{" "}
          <TextLink href="/settings">Open Settings</TextLink>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Board status"
        className="mb-4 grid grid-cols-3 gap-1 border-b border-kl-divider md:hidden"
      >
        {BOARD_STATUSES.map((status) => {
          const active = mobileStatus === status;
          const count =
            status === "doing"
              ? `${board.columns.doing.length}/${board.doingLimit}`
              : filteredColumns[status].length;
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMobileStatus(status)}
              className={cn(
                "relative flex min-h-11 items-center justify-center gap-2 px-2 text-kl-tab-m text-kl-text-muted",
                active && "text-kl-text",
              )}
            >
              <StatusDot status={status} />
              <span className="font-medium">{BOARD_COLUMN_LABELS[status]}</span>
              <span className="text-kl-meta text-kl-text-muted">({count})</span>
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-kl-full bg-kl-accent"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <InlineAlert className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        </InlineAlert>
      ) : null}

      <span className="sr-only" role="status" aria-live="polite">
        {updateTask.isPending ? "Saving board change" : ""}
      </span>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div className="flex flex-col gap-[var(--kl-space-column-gap)] md:flex-row md:items-start md:overflow-x-auto md:pb-4">
          {(isDesktop ? [...BOARD_STATUSES] : [mobileStatus]).map((status) => (
            <div key={status} className="min-w-0 md:shrink-0">
              <BoardColumn
                status={status}
                tasks={filteredColumns[status]}
                projects={projectList}
                defaultProjectId={effectiveProjectId}
                doingCount={board.columns.doing.length}
                doingLimit={board.doingLimit}
              />
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
