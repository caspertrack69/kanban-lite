import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-kl-card border border-kl-border bg-kl-card p-6 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-kl-full bg-kl-raised text-kl-text-muted">
          <SearchX aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <h1 className="mt-4 text-kl-section-title text-kl-text">
          Page not found
        </h1>
        <p className="mt-2 text-kl-body text-kl-text-secondary">
          That page does not exist in Kanban Lite.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-kl-control bg-kl-accent px-4 text-kl-body font-medium text-kl-text-on-accent transition-colors hover:bg-kl-accent-hover"
        >
          Back to board
        </Link>
      </div>
    </div>
  );
}
