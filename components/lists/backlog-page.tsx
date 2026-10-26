"use client";

import { useParams } from "next/navigation";
import { Layers, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { useTaskUI } from "@/components/tasks/task-ui-provider";
import { messageForError } from "@/lib/errors";
import { useBacklog, useProjects } from "@/lib/hooks";
import { queryKeys } from "@/lib/query-keys";
import { QuickAddInline } from "./quick-add-inline";
import { SortableTaskList } from "./sortable-task-list";
import { BacklogMoveAction } from "./task-actions";

export function BacklogPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="space-y-3 pb-6 pt-8">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-52" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-kl-card" />
        ))}
      </div>
    </div>
  );
}

export function BacklogPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const validId = Number.isInteger(projectId) && projectId > 0;
  const projects = useProjects();
  const backlog = useBacklog(projectId);
  const { openCreate } = useTaskUI();

  if (projects.isPending) {
    return <BacklogPageSkeleton />;
  }

  if (projects.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader title="Backlog" section="Backlog" />
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
      </div>
    );
  }

  const project = projects.data?.find((item) => item.id === projectId);

  if (!validId || !project) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader title="Backlog" section="Backlog" />
        <InlineAlert>
          <p>
            {validId
              ? "This project no longer exists. It may have been deleted."
              : "This project link is invalid."}
          </p>
          <p className="mt-2">
            <TextLink href="/settings">Manage projects in Settings</TextLink>
          </p>
        </InlineAlert>
      </div>
    );
  }

  const count = backlog.data?.tasks.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={project.name}
        section="Backlog"
        description={
          backlog.data
            ? `${count} ${count === 1 ? "task" : "tasks"} waiting for the active board.`
            : "Ideas and features waiting for the active board."
        }
        action={
          <Button
            variant="primary"
            onClick={() =>
              openCreate({ status: "backlog", projectId: project.id })
            }
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Add task
          </Button>
        }
      />

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: project.color }}
          />
          <span className="text-kl-meta text-kl-text-muted">
            Backlog for {project.name}
          </span>
        </div>

        <QuickAddInline
          status="backlog"
          projectId={project.id}
          placeholder={`Add a task to ${project.name}`}
        />

        {backlog.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-kl-card" />
            ))}
          </div>
        ) : backlog.isError ? (
          <InlineAlert>
            <p>{messageForError(backlog.error)}</p>
            <button
              type="button"
              onClick={() => void backlog.refetch()}
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
        ) : count === 0 ? (
          <EmptyState
            icon={Layers}
            title="Backlog is empty"
            description="Add a feature, idea, or future task here. Pull it to To Do when it is ready for the active board."
          />
        ) : (
          <>
            <SortableTaskList
              tasks={backlog.data.tasks}
              queryKey={queryKeys.backlog(project.id)}
              renderActions={(task) => <BacklogMoveAction task={task} />}
            />
            <p className="px-1 text-kl-meta text-kl-text-muted">
              Moving a task to To Do puts it on the active board.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
