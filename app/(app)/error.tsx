"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] Route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-kl-card border border-kl-border bg-kl-card p-6">
        <LogoMark />
        <h1 className="mt-4 text-kl-section-title text-kl-text">
          Something went wrong
        </h1>
        <p className="mt-2 text-kl-body text-kl-text-secondary">
          The board hit an unexpected problem. Your saved data is unaffected.
        </p>
        {error.digest ? (
          <p className="mt-2 text-kl-meta text-kl-text-muted">
            Reference: {error.digest}
          </p>
        ) : null}
        <Button variant="primary" className="mt-5" onClick={reset}>
          <RefreshCw aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Try again
        </Button>
      </div>
    </div>
  );
}
