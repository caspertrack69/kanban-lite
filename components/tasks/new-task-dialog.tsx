"use client";

import { useState, type FormEvent } from "react";
import { FolderPlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/lib/constants";
import { messageForError } from "@/lib/errors";
import { useCreateTask, useProjects } from "@/lib/hooks";

export type NewTaskDefaults = {
  status?: TaskStatus;
  projectId?: number | null;
};

function NewTaskDialogContent({
  open,
  defaults,
  onClose,
}: {
  open: boolean;
  defaults?: NewTaskDefaults;
  onClose: () => void;
}) {
  const projects = useProjects();
  const createTask = useCreateTask();

  const initialProjectId =
    defaults?.projectId ?? projects.data?.[0]?.id ?? null;
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<TaskStatus>(
    defaults?.status ?? (initialProjectId !== null ? "todo" : "inbox"),
  );
  const [projectId, setProjectId] = useState<number | null>(initialProjectId);
  const [error, setError] = useState<string | null>(null);

  const effectiveProjectId = projectId ?? projects.data?.[0]?.id ?? null;
  const hasProjects = (projects.data?.length ?? 0) > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }

    if (status !== "inbox" && effectiveProjectId === null) {
      setError("Choose a project before creating this task outside Inbox.");
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        note: note.trim().length > 0 ? note.trim() : null,
        status,
        projectId: status === "inbox" ? null : effectiveProjectId,
      },
      {
        onSuccess: () => onClose(),
        onError: (mutationError) => setError(messageForError(mutationError)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New task"
      description="Capture the work now; refine the details later."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createTask.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-task-form"
            variant="primary"
            disabled={createTask.isPending}
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
            Create task
          </Button>
        </>
      }
    >
      <form id="new-task-form" className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Title" htmlFor="new-task-title">
          <Input
            id="new-task-title"
            data-autofocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="What needs to happen?"
            autoComplete="off"
          />
        </Field>

        <Field label="Note" htmlFor="new-task-note" hint="Optional, plain text.">
          <Textarea
            id="new-task-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2_000}
            rows={3}
            placeholder="Short context, links, or next steps"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="new-task-status">
            <Select
              id="new-task-status"
              value={status}
              onChange={(event) => {
                const nextStatus = event.target.value as TaskStatus;
                setStatus(nextStatus);
                if (nextStatus !== "inbox" && effectiveProjectId === null) {
                  setProjectId(projects.data?.[0]?.id ?? null);
                }
              }}
            >
              {TASK_STATUSES.map((option) => (
                <option
                  key={option}
                  value={option}
                  disabled={!hasProjects && option !== "inbox"}
                >
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Project"
            htmlFor="new-task-project"
            hint={status === "inbox" ? "Inbox tasks have no project yet." : undefined}
          >
            <Select
              id="new-task-project"
              value={status === "inbox" ? "" : (effectiveProjectId ?? "")}
              disabled={!hasProjects || status === "inbox"}
              onChange={(event) =>
                setProjectId(
                  event.target.value === ""
                    ? null
                    : Number(event.target.value),
                )
              }
            >
              <option value="">No project</option>
              {projects.data?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {!hasProjects ? (
          projects.isError ? (
            <InlineAlert>
              <p>{messageForError(projects.error)}</p>
              <button
                type="button"
                className="mt-2 font-medium underline"
                onClick={() => void projects.refetch()}
              >
                Try again
              </button>
            </InlineAlert>
          ) : (
            <div className="flex items-start gap-2 rounded-kl-control bg-kl-raised px-3.5 py-3 text-kl-body text-kl-text-secondary">
              <FolderPlus
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-kl-text-muted"
                strokeWidth={1.5}
              />
              <span>
                You need a project before using Backlog, To Do, Doing, or Done.
                <TextLink href="/settings" className="ml-1">
                  Create one in Settings
                </TextLink>
                .
              </span>
            </div>
          )
        ) : null}

        {status === "doing" ? (
          <p className="text-kl-meta text-kl-text-muted">
            Doing capacity is checked by the server when the task is created.
          </p>
        ) : null}

        {error ? <InlineAlert>{error}</InlineAlert> : null}
      </form>
    </Dialog>
  );
}

export function NewTaskDialog({
  open,
  defaults,
  onClose,
}: {
  open: boolean;
  defaults?: NewTaskDefaults;
  onClose: () => void;
}) {
  return (
    <NewTaskDialogContent open={open} defaults={defaults} onClose={onClose} />
  );
}
