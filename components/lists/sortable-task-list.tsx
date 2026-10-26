"use client";

import { useId, useState, type ReactNode } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { InlineAlert } from "@/components/ui/inline-alert";
import { TaskCard, TaskCardPreview } from "@/components/board/task-card";
import { messageForError } from "@/lib/errors";
import { useUpdateTask } from "@/lib/hooks";
import { reorderTasks } from "@/lib/optimistic";
import type { TaskDTO, TaskListData } from "@/lib/types";

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function SortableTaskList({
  tasks,
  queryKey,
  renderActions,
}: {
  tasks: TaskDTO[];
  queryKey: QueryKey;
  renderActions?: (task: TaskDTO) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const dropId = useId();
  const { setNodeRef, isOver } = useDroppable({
    id: `list-drop-${dropId}`,
    data: { type: "list" },
  });
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeTask =
    activeTaskId === null
      ? undefined
      : tasks.find((task) => task.id === activeTaskId);

  function handleDragStart(event: DragStartEvent) {
    setError(null);
    setActiveTaskId(Number(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    if (!event.over) return;

    const activeId = Number(event.active.id);
    const overId = String(event.over.id);
    const others = tasks.filter((task) => task.id !== activeId);
    let insertIndex = others.length;

    if (overId !== `list-drop-${dropId}`) {
      const overTaskId = Number(event.over.id);
      if (!Number.isInteger(overTaskId) || overTaskId === activeId) return;
      const overIndex = tasks.findIndex((task) => task.id === overTaskId);
      if (overIndex === -1) return;
      insertIndex = overIndex;
    }

    insertIndex = Math.max(0, Math.min(insertIndex, others.length));
    const beforeId = insertIndex > 0 ? others[insertIndex - 1].id : null;
    const afterId = insertIndex < others.length ? others[insertIndex].id : null;

    const optimistic = reorderTasks(tasks, activeId, { beforeId, afterId });
    if (arraysEqual(optimistic.map((task) => task.id), tasks.map((task) => task.id))) {
      return;
    }

    const snapshot = queryClient.getQueryData<TaskListData>(queryKey);
    if (!snapshot) return;

    void queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, { tasks: optimistic });
    setError(null);

    updateTask.mutate(
      { id: activeId, input: { beforeId, afterId } },
      {
        onError: (mutationError) => {
          queryClient.setQueryData(queryKey, snapshot);
          setError(messageForError(mutationError));
        },
      },
    );
  }

  return (
    <div>
      {error ? (
        <InlineAlert className="mb-3">
          <div className="flex items-center justify-between gap-3">
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
        {updateTask.isPending ? "Saving list change" : ""}
      </span>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
      >
        <div
          ref={setNodeRef}
          className={
            isOver
              ? "space-y-3 rounded-kl-card bg-white/[0.02] p-1"
              : "space-y-3 p-1"
          }
        >
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                status={task.status ?? "inbox"}
                actions={renderActions?.(task)}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
