import { cn } from "@/lib/cn";
import type { BoardStatus } from "@/lib/constants";
import { StatusDot } from "./status-dot";

export function StatusLabel({
  status,
  label,
  count,
  className,
}: {
  status: BoardStatus;
  label: string;
  count?: string | number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 text-kl-tab-m text-kl-text md:text-kl-tab",
        className,
      )}
    >
      <StatusDot status={status} />
      <span className="truncate font-medium">{label}</span>
      {count !== undefined ? (
        <span className="text-kl-tab-m font-normal text-kl-text-muted md:text-kl-tab">
          ({count})
        </span>
      ) : null}
    </span>
  );
}
