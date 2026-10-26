import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  section,
  action,
}: {
  title: string;
  description?: string;
  section?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-[64px] items-center justify-between gap-4 pb-5 pt-5 md:min-h-[var(--kl-header)] md:py-0">
      <div className="min-w-0">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-kl-meta text-kl-text-muted"
        >
          <Link
            href="/"
            className="transition-colors hover:text-kl-text-secondary"
          >
            Kanban Lite
          </Link>
          <ChevronRight
            aria-hidden="true"
            className="size-3"
            strokeWidth={1.5}
          />
          <span className="truncate text-kl-text">{section ?? title}</span>
        </nav>
        <h1 className="mt-1 truncate text-kl-page-title-m tracking-kl-title text-kl-text md:text-kl-page-title">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-kl-meta text-kl-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
