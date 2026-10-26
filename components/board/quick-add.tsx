"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import type { BoardStatus } from "@/lib/constants";
import { messageForError } from "@/lib/errors";
import { useCreateTask } from "@/lib/hooks";
import type { ProjectDTO } from "@/lib/types";

export function QuickAdd({
  status,
  projects,
  defaultProjectId,
  doingCount,
  doingLimit,
}: {
  status: BoardStatus;
  projects: ProjectDTO[];
  defaultProjectId: number | null;
  doingCount: number;
  doingLimit: number;
}) {
  const createTask = useCreateTask();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | null>(defaultProjectId);
  const [error, setError] = useState<string | null>(null);

  const doingFull =
    status === "doing" && doingCount >= doingLimit;
  const projectOptions = projects.map((project) => ({
    value: String(project.id),
    label: project.name,
  }));


  function collapse() {
    setExpanded(false);
    setTitle("");
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }
    if (projectId === null) {
      setError("Choose a project first.");
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        status,
        projectId,
      },
      {
        onSuccess: () => collapse(),
        onError: (mutationError) => setError(messageForError(mutationError)),
      },
    );
  }

  if (!expanded) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={doingFull}
          onClick={() => {
            setProjectId(defaultProjectId ?? projects[0]?.id ?? null);
            setExpanded(true);
          }}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-kl-add bg-kl-raised text-kl-body font-medium text-kl-text-secondary transition-colors duration-[var(--kl-duration-fast)] hover:bg-white/10 hover:text-kl-text disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Add task
        </button>
        {doingFull ? (
          <p className="text-center text-kl-meta text-kl-text-muted">
            Doing is full ({doingCount}/{doingLimit}). Move a card first.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-kl-card border border-kl-border bg-kl-card p-3"
    >
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder="Task title"
          aria-label="New task title"
          className="h-11 text-kl-body"
        />
        <IconButton
          type="button"
          label="Cancel"

          onClick={collapse}
        >
          <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </IconButton>
      </div>

      {projects.length > 0 ? (
        <Select
          value={projectId !== null ? String(projectId) : ""}
          options={projectOptions}
          placeholder="Choose a project"
          aria-label="Project"
          onValueChange={(value) => setProjectId(Number(value))}
        />
      ) : (
        <p className="rounded-kl-control bg-kl-raised px-3 py-2 text-kl-meta text-kl-text-secondary">
          Create a project first in{" "}
          <TextLink href="/settings">Settings</TextLink>.
        </p>
      )}

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={createTask.isPending || projects.length === 0}
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
        Add to {status === "todo" ? "To Do" : status === "doing" ? "Doing" : "Done"}
      </Button>
    </form>
  );
}
