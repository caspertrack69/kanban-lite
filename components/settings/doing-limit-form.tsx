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
  const changed = valid && parsed !== initialLimit;
  const belowCount = valid && parsed < doingCount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!valid) return;

    updateSettings.mutate(parsed, {
      onSuccess: () => setValue(String(parsed)),
      onError: (mutationError) => setError(messageForError(mutationError)),
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="doing-limit"
              className="text-kl-body font-medium text-kl-text"
            >
              Doing limit
            </label>
            <span className="rounded-kl-full bg-kl-raised px-2.5 py-0.5 text-kl-meta text-kl-text-muted">
              {formatDoingCount(doingCount, initialLimit)} in use
            </span>
          </div>
          <p className="mt-1 text-kl-meta text-kl-text-muted">
            New cards stop entering Doing at this number.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            id="doing-limit"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={!valid ? true : undefined}
            className="h-11 w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={updateSettings.isPending || !changed}
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
            Save
          </Button>
        </div>
      </div>

      {belowCount ? (
        <p className="text-kl-meta text-kl-text-muted">
          The {doingCount} cards already in Doing stay there. New cards remain
          blocked until it drops below {parsed}.
        </p>
      ) : null}

      {!valid ? (
        <p className="text-kl-meta text-kl-danger" role="alert">
          Use a whole number of 1 or more.
        </p>
      ) : null}

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </form>
  );
}
