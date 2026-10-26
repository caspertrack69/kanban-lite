"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import type { TaskStatus } from "@/lib/constants";
import { messageForError } from "@/lib/errors";
import { useCreateTask } from "@/lib/hooks";

export function QuickAddInline({
  status,
  projectId,
  placeholder,
}: {
  status: TaskStatus;
  projectId?: number | null;
  placeholder: string;
}) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (title.trim().length === 0) return;

    createTask.mutate(
      {
        title: title.trim(),
        status,
        projectId: status === "inbox" ? null : projectId,
      },
      {
        onSuccess: () => setTitle(""),
        onError: (mutationError) => setError(messageForError(mutationError)),
      },
    );
  }

  return (
    <div className="space-y-2">
      <form className="flex items-start gap-2" onSubmit={handleSubmit}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-12"
        />
        <Button
          type="submit"
          variant="primary"
          className="h-12 px-4"
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
          Add
        </Button>
      </form>
      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </div>
  );
}
