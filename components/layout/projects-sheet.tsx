"use client";

import Link from "next/link";
import { ChevronRight, FolderKanban, Settings2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { messageForError } from "@/lib/errors";
import { useProjects } from "@/lib/hooks";

export function ProjectsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const projects = useProjects();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Projects"
      description="Open a project backlog or manage projects in Settings."
      placement="right"
      footer={
        <Link
          href="/settings"
          onClick={onClose}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-kl-control bg-kl-raised px-4 text-kl-body font-medium text-kl-text transition-colors hover:bg-white/10"
        >
          <Settings2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Manage projects
        </Link>
      }
    >
      {projects.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-kl-control" />
          ))}
        </div>
      ) : projects.isError ? (
        <InlineAlert>
          <p>{messageForError(projects.error)}</p>
          <button
            type="button"
            onClick={() => void projects.refetch()}
            className="mt-2 font-medium underline"
          >
            Try again
          </button>
        </InlineAlert>
      ) : projects.data && projects.data.length > 0 ? (
        <ul className="space-y-1">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link
                href={`/p/${project.id}`}
                onClick={onClose}
                className="flex min-h-14 items-center gap-3 rounded-kl-control px-3 py-2 transition-colors hover:bg-white/5"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: project.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-kl-body font-medium text-kl-text">
                    {project.name}
                  </span>
                  <span className="text-kl-meta text-kl-text-muted">
                    {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-kl-text-muted"
                  strokeWidth={1.5}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project in Settings to give your backlog a home."
          action={<TextLink href="/settings" onClick={onClose}>Open Settings</TextLink>}
        />
      )}
    </Dialog>
  );
}
