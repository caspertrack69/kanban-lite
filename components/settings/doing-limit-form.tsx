"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { formatDoingCount } from "@/lib/format";
import { messageForError } from "@/lib/errors";
import { useUpdateSettings } from "@/lib/hooks";

export function DoingLimitForm({
  initialLimit,
  doingCount,
}: {
  initialLimit: number;
  doingCount: number;
}) {
  const updateSettings = useUpdateSettings();
  const [value, setValue] = useState(String(initialLimit));
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 1;
  const unchanged = valid && parsed === initialLimit;
  const belowCount = valid && parsed < doingCount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!valid) {
      setError("Doing limit must be a whole number of at least 1.");
      return;
    }

    updateSettings.mutate(parsed, {
      onSuccess: () => setValue(String(parsed)),
      onError: (mutationError) => setError(messageForError(mutationError)),
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-kl-body text-kl-text-secondary">
          Currently in Doing:
        </span>
        <span className="rounded-kl-full bg-kl-raised px-3 py-1 text-kl-tag font-medium text-kl-text">
          {formatDoingCount(doingCount, initialLimit)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <label
            htmlFor="doing-limit"
            className="block text-kl-meta font-medium text-kl-text-muted"
          >
            Doing limit
          </label>
          <Input
            id="doing-limit"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={!valid ? true : undefined}
            className="w-full sm:w-36"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={updateSettings.isPending || unchanged}
        >
          {updateSettings.isPending ? (
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin"
              strokeWidth={1.5}
            />
          ) : (
            <Save aria-hidden="true" className="size-4" strokeWidth={1.5} />
          )}
          Save limit
        </Button>
      </div>

      {belowCount ? (
        <p className="text-kl-meta text-kl-text-muted">
          This is below the current Doing count ({doingCount}). Existing cards
          stay where they are; new additions will be blocked until Doing drops
          below the new limit.
        </p>
      ) : (
        <p className="text-kl-meta text-kl-text-muted">
          New cards are rejected once Doing reaches this number. Lowering the
          limit never moves existing cards.
        </p>
      )}

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </form>
  );
}
