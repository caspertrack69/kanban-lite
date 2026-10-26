import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-kl-card border border-dashed border-kl-border px-5 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-kl-full bg-kl-raised text-kl-text-muted">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-kl-body font-medium text-kl-text">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-kl-meta text-kl-text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
