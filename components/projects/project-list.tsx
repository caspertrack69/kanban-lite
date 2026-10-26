"use client";

import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import type { ProjectDTO } from "@/lib/types";

export function ProjectList({
  projects,
  onCreate,
  onEdit,
  onDelete,
}: {
  projects: ProjectDTO[];
  onCreate: () => void;
  onEdit: (project: ProjectDTO) => void;
  onDelete: (project: ProjectDTO) => void;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create a project to give tasks a home and a color on the board."
        action={
          <Button variant="primary" onClick={onCreate}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Create project
          </Button>
        }
      />
    );
  }

  return (
    <div className="divide-y divide-kl-divider overflow-hidden rounded-kl-card border border-kl-border bg-kl-card">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
        >
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-kl-body font-medium text-kl-text">
              {project.name}
            </p>
            <p className="text-kl-meta text-kl-text-muted">
              {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label={`Edit ${project.name}`}
              onClick={() => onEdit(project)}
            >
              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </IconButton>
            <IconButton
              label={`Delete ${project.name}`}
              variant="danger"
              onClick={() => onDelete(project)}
            >
              <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}
