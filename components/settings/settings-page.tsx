"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { messageForError } from "@/lib/errors";
import { useLogout, useProjects, useSettings } from "@/lib/hooks";
import type { ProjectDTO } from "@/lib/types";
import {
  DeleteProjectDialog,
} from "@/components/projects/delete-project-dialog";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ProjectList } from "@/components/projects/project-list";
import { DoingLimitForm } from "./doing-limit-form";

export function SettingsPage() {
  const settings = useSettings();
  const projects = useProjects();
  const logout = useLogout();
  const router = useRouter();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectDTO | null>(null);

  function openCreate() {
    setEditingProject(null);
    setProjectDialogOpen(true);
  }

  function openEdit(project: ProjectDTO) {
    setEditingProject(project);
    setProjectDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Settings"
        section="Settings"
        description="Manage focus limits, projects, and access."
      />

      <div className="space-y-10 pb-6">
        <section aria-labelledby="focus-limit-heading" className="space-y-3">
          <h2
            id="focus-limit-heading"
            className="text-kl-section-title text-kl-text"
          >
            Focus limit
          </h2>

          <div className="rounded-kl-card border border-kl-border bg-kl-card p-4 md:p-5">
            {settings.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-11 w-36" />
              </div>
            ) : settings.isError ? (
              <InlineAlert>
                <p>{messageForError(settings.error)}</p>
                <button
                  type="button"
                  onClick={() => void settings.refetch()}
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
            ) : (
              <DoingLimitForm
                key={`${settings.data.doingLimit}-${settings.data.doingCount}`}
                initialLimit={settings.data.doingLimit}
                doingCount={settings.data.doingCount}
              />
            )}
          </div>
        </section>

        <section aria-labelledby="projects-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="projects-heading"
                className="text-kl-section-title text-kl-text"
              >
                Projects
              </h2>
              <p className="mt-1 text-kl-meta text-kl-text-muted">
                Group backlog tasks and set card colors.
              </p>
            </div>
            {projects.data && projects.data.length > 0 ? (
              <Button variant="secondary" onClick={openCreate}>
                <Plus
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.5}
                />
                New project
              </Button>
            ) : null}
          </div>

          {projects.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-kl-card" />
              <Skeleton className="h-16 w-full rounded-kl-card" />
            </div>
          ) : projects.isError ? (
            <InlineAlert>
              <p>{messageForError(projects.error)}</p>
              <button
                type="button"
                onClick={() => void projects.refetch()}
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
          ) : (
            <ProjectList
              projects={projects.data}
              onCreate={openCreate}
              onEdit={openEdit}
              onDelete={setDeletingProject}
            />
          )}
        </section>

        <section
          aria-labelledby="session-heading"
          className="border-t border-kl-divider pt-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                id="session-heading"
                className="text-kl-section-title text-kl-text"
              >
                Session
              </h2>
              <p className="mt-1 text-kl-meta text-kl-text-muted">
                Sign out on this device.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => router.replace("/login"),
                })
              }
            >
              <LogOut aria-hidden="true" className="size-4" strokeWidth={1.5} />
              {logout.isPending ? "Signing out" : "Sign out"}
            </Button>
          </div>
          {logout.isError ? (
            <InlineAlert className="mt-3">
              {messageForError(logout.error)}
            </InlineAlert>
          ) : null}
        </section>
      </div>

      <ProjectDialog
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        project={editingProject}
      />
      <DeleteProjectDialog
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
      />
    </div>
  );
}
