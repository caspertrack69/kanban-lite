"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import { messageForError } from "@/lib/errors";
import { useProjects, useUpdateTask } from "@/lib/hooks";
import type { TaskDTO } from "@/lib/types";

export function InboxMoveAction({ task }: { task: TaskDTO }) {
  const projects = useProjects();
  const updateTask = useUpdateTask();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const projectId = selectedProjectId ?? projects.data?.[0]?.id ?? null;
  const projectOptions = (projects.data ?? []).map((project) => ({
    value: String(project.id),
    label: project.name,
  }));

  if (projects.isPending) {
    return <p className="text-kl-meta text-kl-text-muted">Loading projects…</p>;
  }

  if (projects.isError) {
    return (
      <p className="text-kl-meta text-kl-text-muted">
        Could not load projects.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => void projects.refetch()}
        >
          Try again
        </button>
      </p>
    );
  }

  if (!projects.data || projects.data.length === 0) {
    return (
      <p className="text-kl-meta text-kl-text-muted">
        Create a project to move this task.{" "}
        <TextLink href="/settings">Open Settings</TextLink>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Select
            value={projectId !== null ? String(projectId) : ""}
            options={projectOptions}
            placeholder="Select project"
            aria-label={`Project for ${task.title}`}
            onValueChange={(value) => setSelectedProjectId(Number(value))}
          />
        </div>
        <Button
          disabled={projectId === null || updateTask.isPending}
          onClick={() => {
            if (projectId === null) return;
            setError(null);
            updateTask.mutate(
              {
                id: task.id,
                input: { projectId, status: "backlog" },
              },
              {
                onError: (mutationError) =>
                  setError(messageForError(mutationError)),
              },
            );
          }}
        >
          {updateTask.isPending ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin"
              strokeWidth={1.5}
            />
          ) : (
            <ArrowRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.5}
            />
          )}
          Move to backlog
        </Button>
      </div>
      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </div>
  );
}

export function BacklogMoveAction({ task }: { task: TaskDTO }) {
  const updateTask = useUpdateTask();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        disabled={updateTask.isPending}
        onClick={() => {
          setError(null);
          updateTask.mutate(
            { id: task.id, input: { status: "todo" } },
            {
              onError: (mutationError) =>
                setError(messageForError(mutationError)),
            },
          );
        }}
      >
        {updateTask.isPending ? (
          <Loader2
            aria-hidden="true"
            className="size-4 animate-spin"
            strokeWidth={1.5}
          />
        ) : (
          <ArrowRight
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.5}
          />
        )}
        Move to To Do
      </Button>
      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </div>
  );
}
