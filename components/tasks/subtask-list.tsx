"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { messageForError } from "@/lib/errors";
import { useCreateTask, useDeleteTask, useUpdateTask } from "@/lib/hooks";
import { subtaskProgress } from "@/lib/task-tree";
import type { TaskDTO } from "@/lib/types";

function SubtaskRow({ subtask }: { subtask: TaskDTO }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [title, setTitle] = useState(subtask.title);
  const [error, setError] = useState<string | null>(null);

  function saveTitle() {
    const nextTitle = title.trim();
    if (nextTitle.length === 0) {
      setTitle(subtask.title);
      setError("Title cannot be empty.");
      return;
    }
    if (nextTitle === subtask.title) return;

    setError(null);
    updateTask.mutate(
      { id: subtask.id, input: { title: nextTitle } },
      { onError: (mutationError) => setError(messageForError(mutationError)) },
    );
  }

  const completed = subtask.doneAt !== null;

  return (
    <li className="group flex min-h-11 items-start gap-2.5 rounded-kl-sm px-1 py-1.5">
      <span className="mt-0.5">
        <Checkbox
          checked={completed}
          label={`Mark ${subtask.title} ${completed ? "incomplete" : "complete"}`}
          disabled={updateTask.isPending}
          onCheckedChange={(checked) => {
            setError(null);
            updateTask.mutate(
              {
                id: subtask.id,
                input: { completed: checked },
              },
              {
                onSuccess: () => setError(null),
                onError: (mutationError) =>
                  setError(messageForError(mutationError)),
              },
            );
          }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <input
          aria-label={`Sub-task title: ${subtask.title}`}
          value={title}
          maxLength={200}
          disabled={completed}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="w-full rounded-kl-xs border border-transparent bg-transparent py-0.5 text-kl-body text-kl-text-secondary outline-none transition-colors hover:border-kl-border focus-visible:border-kl-accent disabled:text-kl-text-disabled disabled:line-through"
        />
        {error ? (
          <p className="mt-1 text-kl-meta text-kl-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <IconButton
        label={`Delete sub-task ${subtask.title}`}
        className="-mr-1 -mt-1 size-11 opacity-100 lg:size-8 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        disabled={deleteTask.isPending}
        onClick={() =>
          deleteTask.mutate(subtask.id, {
            onError: (mutationError) => setError(messageForError(mutationError)),
          })
        }
      >
        <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </IconButton>
    </li>
  );
}

export function SubtaskList({ parent }: { parent: TaskDTO }) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const progress = subtaskProgress(parent.subtasks);

  function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (nextTitle.length === 0) return;
    setError(null);

    createTask.mutate(
      { title: nextTitle, parentId: parent.id },
      {
        onSuccess: () => setTitle(""),
        onError: (mutationError) => setError(messageForError(mutationError)),
      },
    );
  }

  return (
    <section aria-labelledby="subtasks-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3
          id="subtasks-heading"
          className="text-kl-meta font-medium text-kl-text-muted"
        >
          Subtasks{" "}
          {progress.total > 0 ? (
            <span className="font-normal">({progress.label})</span>
          ) : null}
        </h3>
      </div>

      {progress.total > 0 ? (
        <ProgressBar
          value={progress.done}
          max={progress.total}
          label={`${progress.label} subtasks complete`}
        />
      ) : null}

      <ul className="space-y-0.5">
        {parent.subtasks.map((subtask) => (
          <SubtaskRow key={subtask.id} subtask={subtask} />
        ))}
      </ul>

      <form className="flex items-center gap-2" onSubmit={addSubtask}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a subtask"
          maxLength={200}
          aria-label="New sub-task title"
          variant="bare"
          className="h-11 px-1 text-kl-body"
        />
        <IconButton
          type="submit"
          label="Add sub-task"
          variant="raised"
          disabled={createTask.isPending || title.trim().length === 0}
        >
          {createTask.isPending ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin"
              strokeWidth={1.5}
            />
          ) : (
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
          )}
        </IconButton>
      </form>

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </section>
  );
}
