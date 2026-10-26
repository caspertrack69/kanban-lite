import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  label?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label ?? `${value} of ${max} complete`}
      className={cn(
        "h-1 w-full overflow-hidden rounded-kl-full bg-kl-raised",
        className,
      )}
    >
      <div
        className="h-full rounded-kl-full bg-kl-accent transition-[width] duration-[var(--kl-duration-base)] ease-kl"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
