"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { messageForError } from "@/lib/errors";
import { useDeleteProject } from "@/lib/hooks";
import type { ProjectDTO } from "@/lib/types";

export function DeleteProjectDialog({
  project,
  onClose,
}: {
  project: ProjectDTO | null;
  onClose: () => void;
}) {
  const deleteProject = useDeleteProject();
  const [error, setError] = useState<{
    projectId: number;
    message: string;
  } | null>(null);

  function handleDelete() {
    if (!project) return;
    setError(null);
    deleteProject.mutate(project.id, {
      onSuccess: () => onClose(),
      onError: (mutationError) =>
        setError({
          projectId: project.id,
          message: messageForError(mutationError),
        }),
    });
  }

  return (
    <ConfirmDialog
      open={project !== null}
      onClose={() => {
        setError(null);
        onClose();
      }}
      onConfirm={handleDelete}
      title="Delete project?"
      description={
        project
          ? `This permanently deletes ${project.name} and every task and sub-task inside it.`
          : undefined
      }
      confirmLabel="Delete project"
      pending={deleteProject.isPending}
      error={
        project && error?.projectId === project.id ? error.message : null
      }
    >
      {project ? (
        <p className="rounded-kl-control bg-kl-raised px-4 py-3 text-kl-body text-kl-text-secondary">
          <span className="font-medium text-kl-text">
            {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
          </span>{" "}
          will be deleted. This action cannot be undone.
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
