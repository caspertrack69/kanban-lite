"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { messageForError } from "@/lib/errors";
import { useSession } from "@/lib/hooks";

function SessionLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-kl-bg px-5"
      role="status"
      aria-live="polite"
    >
      <LogoMark size="lg" />
      <div className="flex items-center gap-2 text-kl-body text-kl-text-muted">
        <Loader2
          aria-hidden="true"
          className="size-4 animate-spin"
          strokeWidth={1.5}
        />
        {label}
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isFetching } = useSession();

  useEffect(() => {
    if (data && !data.authenticated) {
      router.replace("/login");
    }
  }, [data, router]);

  if (isPending) {
    return <SessionLoader label="Checking your session" />;
  }

  if (isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-kl-bg px-5">
        <div
          className="w-full max-w-md rounded-kl-card border border-kl-border bg-kl-card p-6"
          role="alert"
        >
          <LogoMark />
          <h1 className="mt-4 text-kl-section-title text-kl-text">
            Cannot verify your session
          </h1>
          <p className="mt-2 text-kl-body text-kl-text-secondary">
            {messageForError(error)}
          </p>
          <p className="mt-2 text-kl-meta text-kl-text-muted">
            Check the server environment and try again. You are not being
            redirected, so a configuration problem stays visible.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-kl-control bg-kl-accent px-4 text-kl-body font-medium text-kl-text-on-accent transition-colors duration-[var(--kl-duration-fast)] hover:bg-kl-accent-hover disabled:opacity-60"
          >
            <RefreshCw
              aria-hidden="true"
              className={isFetching ? "size-4 animate-spin" : "size-4"}
              strokeWidth={1.5}
            />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data?.authenticated) {
    return <SessionLoader label="Redirecting to sign in" />;
  }

  return children;
}
