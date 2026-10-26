import { cn } from "@/lib/cn";
import { STATUS_COLORS } from "@/lib/design-tokens.generated";
import type { BoardStatus } from "@/lib/constants";

export function StatusDot({
  status,
  className,
}: {
  status: BoardStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-[2px]", className)}
      style={{ backgroundColor: STATUS_COLORS[status] }}
    />
  );
}
