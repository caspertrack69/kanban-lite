"use client";

import { Inbox, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskUI } from "@/components/tasks/task-ui-provider";
import { messageForError } from "@/lib/errors";
import { useInbox } from "@/lib/hooks";
import { queryKeys } from "@/lib/query-keys";
import { InboxMoveAction } from "./task-actions";
import { QuickAddInline } from "./quick-add-inline";
import { SortableTaskList } from "./sortable-task-list";

export function InboxPage() {
  const inbox = useInbox();
  const { openCreate } = useTaskUI();
  const count = inbox.data?.tasks.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Inbox"
        section="Inbox"
        description={
          inbox.data
            ? `${count} ${count === 1 ? "capture" : "captures"} waiting for a project.`
            : "Raw captures waiting for a project."
        }
        action={
          <Button
            variant="primary"
            onClick={() => openCreate({ status: "inbox", projectId: null })}
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Add task
          </Button>
        }
      />

      <div className="space-y-5">
        <QuickAddInline
          status="inbox"
          placeholder="Capture a thought, task, or idea"
        />

        {inbox.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-kl-card" />
            ))}
          </div>
        ) : inbox.isError ? (
          <InlineAlert>
            <p>{messageForError(inbox.error)}</p>
            <button
              type="button"
              onClick={() => void inbox.refetch()}
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
            icon={Inbox}
            title="Inbox is clear"
            description="Send a message to the Telegram bot or capture a thought above. Nothing gets lost and nothing clutters the board."
          />
        ) : (
          <>
            <SortableTaskList
              tasks={inbox.data.tasks}
              queryKey={queryKeys.inbox}
              renderActions={(task) => <InboxMoveAction task={task} />}
            />
            <p className="px-1 text-kl-meta text-kl-text-muted">
              Moving a task to a project sends it to that project&apos;s
              backlog.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
