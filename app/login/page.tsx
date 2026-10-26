"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { LogoMark } from "@/components/brand";
import { messageForError } from "@/lib/errors";
import { useLogin, useSession } from "@/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const login = useLogin();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.data?.authenticated) {
      router.replace("/");
    }
  }, [router, session.data]);

  const sessionError = session.isError ? messageForError(session.error) : null;
  const sessionMisconfigured =
    sessionError && (session.error as { status?: number })?.status === 503;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    login.mutate(password, {
      onSuccess: () => router.replace("/"),
      onError: (mutationError) => setError(messageForError(mutationError)),
    });
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-kl-bg px-5 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-kl-full opacity-20 blur-3xl"
        style={{ backgroundColor: "var(--kl-accent)" }}
      />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size="lg" />
          <div>
            <p className="text-kl-breadcrumb font-medium text-kl-text">
              Kanban Lite
            </p>
            <p className="text-kl-meta text-kl-text-muted">
              A small board for the work in front of you.
            </p>
          </div>
        </div>

        <section className="rounded-kl-sheet border border-kl-border bg-kl-card p-6 md:p-8">
          <div className="flex items-center gap-2 text-kl-meta font-medium text-kl-accent">
            <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Private workspace
          </div>
          <h1 className="mt-4 text-kl-page-title-m tracking-kl-title text-kl-text md:text-kl-page-title">
            Welcome back
          </h1>
          <p className="mt-2 text-kl-body text-kl-text-secondary">
            Enter the shared password to open your board.
          </p>

          {sessionMisconfigured ? (
            <div
              className="mt-5 rounded-kl-control border border-kl-danger/30 bg-kl-danger/10 p-4 text-kl-body text-kl-text-secondary"
              role="alert"
            >
              <p className="font-medium text-kl-text">Login is not configured</p>
              <p className="mt-1">{sessionError}</p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="block text-kl-meta font-medium text-kl-text-muted"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="h-12 w-full rounded-kl-control border border-transparent bg-kl-raised px-4 text-kl-body text-kl-text outline-none transition-colors duration-[var(--kl-duration-fast)] placeholder:text-kl-text-disabled hover:bg-kl-raised focus-visible:border-kl-accent"
                  placeholder="Your password"
                />
              </div>

              {error ? (
                <p
                  id="login-error"
                  role="alert"
                  className="rounded-kl-control bg-kl-danger/10 px-3 py-2 text-kl-body text-kl-danger"
                >
                  {error}
                </p>
              ) : null}

              {sessionError && !sessionMisconfigured ? (
                <p
                  role="alert"
                  className="rounded-kl-control bg-kl-danger/10 px-3 py-2 text-kl-body text-kl-danger"
                >
                  {sessionError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={login.isPending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-kl-control bg-kl-accent px-4 text-kl-body font-medium text-kl-text-on-accent transition-colors duration-[var(--kl-duration-fast)] hover:bg-kl-accent-hover active:bg-kl-accent-pressed disabled:cursor-not-allowed disabled:opacity-60"
              >
                {login.isPending ? (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 animate-spin"
                    strokeWidth={1.5}
                  />
                ) : (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.5}
                  />
                )}
                {login.isPending ? "Signing in" : "Sign in"}
              </button>
            </form>
          )}
        </section>

        <p className="mt-5 text-center text-kl-meta text-kl-text-muted">
          Single-user workspace · Password protected
        </p>
      </div>
    </main>
  );
}
