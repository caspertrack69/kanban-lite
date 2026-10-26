"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input, Textarea } from "@/components/ui/input";
import { NO_SELECTION, Select } from "@/components/ui/select";
import { ProjectChip } from "@/components/ui/tag-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/constants";
import { messageForError } from "@/lib/errors";
import {
  useDeleteTask,
  useProjects,
  useTask,
  useUpdateTask,
} from "@/lib/hooks";
import type { TaskDTO } from "@/lib/types";
import { SubtaskList } from "./subtask-list";

function TaskDetailBody({
  task,
  onClose,
}: {
  task: TaskDTO;
  onClose: () => void;
}) {
  const projects = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSubtask = task.parentId !== null;
  const completed = task.doneAt !== null;
  const projectOptions = [
    { value: NO_SELECTION, label: "No project (Inbox)" },
    ...(projects.data ?? []).map((project) => ({
      value: String(project.id),
      label: project.name,
    })),
  ];
  const statusOptions = TASK_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  }));

  function saveTitle() {
    const nextTitle = title.trim();
    if (nextTitle.length === 0) {
      setTitle(task.title);
      setError("Title cannot be empty.");
      return;
    }
    if (nextTitle === task.title) return;

    setError(null);
    setTitle(nextTitle);
    updateTask.mutate(
      { id: task.id, input: { title: nextTitle } },
      { onError: (mutationError) => setError(messageForError(mutationError)) },
    );
  }

  function saveNote() {
    const nextNote = note.trim();
    if (nextNote === (task.note ?? "")) return;

    setError(null);
    setNote(nextNote);
    updateTask.mutate(
      { id: task.id, input: { note: nextNote.length > 0 ? nextNote : null } },
      { onError: (mutationError) => setError(messageForError(mutationError)) },
    );
  }

  function changeProject(value: string) {
    setError(null);
    if (value === "") {
      updateTask.mutate(
        { id: task.id, input: { projectId: null, status: "inbox" } },
        { onError: (mutationError) => setError(messageForError(mutationError)) },
      );
      return;
    }

    const projectId = Number(value);
    updateTask.mutate(
      {
        id: task.id,
        input: {
          projectId,
          ...(task.status === "inbox" ? { status: "backlog" as const } : {}),
        },
      },
      { onError: (mutationError) => setError(messageForError(mutationError)) },
    );
  }

  function changeStatus(value: TaskStatus) {
    setError(null);
    if (value !== "inbox" && task.projectId === null) {
      setError("Assign a project before moving this task out of Inbox.");
      return;
    }

    updateTask.mutate(
      { id: task.id, input: { status: value } },
      { onError: (mutationError) => setError(messageForError(mutationError)) },
    );
  }

  function handleDelete() {
    setDeleteError(null);
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        onClose();
      },
      onError: (mutationError) =>
        setDeleteError(messageForError(mutationError)),
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          {task.status !== null && task.status !== "inbox" && task.status !== "backlog" ? (
            <span className="inline-flex items-center gap-2 text-kl-meta text-kl-text-muted">
              <CheckCircle2
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.5}
              />
              {STATUS_LABELS[task.status]}
            </span>
          ) : (
            <span className="text-kl-meta text-kl-text-muted">
              {isSubtask ? "Sub-task" : STATUS_LABELS[task.status ?? "inbox"]}
            </span>
          )}
          {updateTask.isPending ? (
            <span
              className="inline-flex items-center gap-1.5 text-kl-meta text-kl-text-muted"
              role="status"
            >
              <Loader2
                aria-hidden="true"
                className="size-3.5 animate-spin"
                strokeWidth={1.5}
              />
              Saving
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-kl-meta text-kl-text-disabled">
              <Save aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
              Autosaves
            </span>
          )}
        </div>

        <Input
          aria-label="Task title"
          value={title}
          maxLength={200}
          variant="bare"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="text-kl-card-title-m tracking-kl-title md:text-kl-card-title"
        />

        <Textarea
          aria-label="Task note"
          value={note}
          maxLength={2_000}
          rows={4}
          variant="bare"
          placeholder="Add a short note"
          onChange={(event) => setNote(event.target.value)}
          onBlur={saveNote}
          className="min-h-20 text-kl-body text-kl-text-secondary"
        />

        {error ? <InlineAlert>{error}</InlineAlert> : null}

        {isSubtask ? (
          <div className="space-y-3 rounded-kl-control bg-kl-raised/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-kl-meta text-kl-text-muted">Project</span>
              {task.project ? (
                <ProjectChip project={task.project} />
              ) : (
                <span className="text-kl-meta text-kl-text-muted">No project</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-kl-meta text-kl-text-muted">Completed</span>
              <Button
                variant={completed ? "primary" : "secondary"}
                onClick={() => {
                  setError(null);
                  updateTask.mutate(
                    { id: task.id, input: { completed: !completed } },
                    {
                      onError: (mutationError) =>
                        setError(messageForError(mutationError)),
                    },
                  );
                }}
              >
                {completed ? "Completed" : "Mark complete"}
              </Button>
            </div>
            <p className="text-kl-meta text-kl-text-muted">
              This sub-task follows its parent&apos;s status. Open the parent to
              change project or workflow state.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project" htmlFor="task-project">
                <Select
                  id="task-project"
                  value={
                    task.projectId === null
                      ? NO_SELECTION
                      : String(task.projectId)
                  }
                  options={projectOptions}
                  disabled={projects.isPending}
                  onValueChange={(value) =>
                    changeProject(value === NO_SELECTION ? "" : value)
                  }
                />
              </Field>
              <Field label="Status" htmlFor="task-status">
                <Select
                  id="task-status"
                  value={task.status ?? "backlog"}
                  options={statusOptions}
                  onValueChange={(value) =>
                    changeStatus(value as TaskStatus)
                  }
                />
              </Field>
            </div>

            <div className="border-t border-kl-divider pt-5">
              <SubtaskList parent={task} />
            </div>
          </>
        )}

        <div className="border-t border-kl-divider pt-4">
          <Button
            variant="danger"
            onClick={() => {
              setDeleteError(null);
              setConfirmOpen(true);
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Delete task
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          setDeleteError(null);
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete task?"
        description={
          task.subtasks.length > 0
            ? `This task has ${task.subtasks.length} subtask${task.subtasks.length === 1 ? "" : "s"}. They will be deleted too.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete task"
        pending={deleteTask.isPending}
        error={deleteError}
      />
    </>
  );
}

export function TaskDetailSheet({
  taskId,
  onClose,
}: {
  taskId: number | null;
  onClose: () => void;
}) {
  const taskQuery = useTask(taskId);

  return (
    <Dialog
      open={taskId !== null}
      onClose={onClose}
      title={taskId === null ? "Task" : `Task #${taskId}`}
      description="Edit details, move the card, or manage subtasks."
      placement="right"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {taskId === null ? null : taskQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : taskQuery.isError ? (
        <InlineAlert>
          <p>{messageForError(taskQuery.error)}</p>
          <button
            type="button"
            className="mt-2 font-medium underline"
            onClick={() => void taskQuery.refetch()}
          >
            Try again
          </button>
        </InlineAlert>
      ) : taskQuery.data ? (
        <TaskDetailBody
          key={taskQuery.data.id}
          task={taskQuery.data}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}
