import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TAG_CHIP_ALPHA } from "@/lib/design-tokens.generated";
import { hexToRgba } from "@/lib/format";
import type { ProjectSummary } from "@/lib/types";

export function TagChip({
  color,
  children,
  className,
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-[11rem] items-center gap-1.5 truncate rounded-kl-full px-2.5 text-kl-tag-m font-medium md:text-kl-tag",
        className,
      )}
      style={{ backgroundColor: hexToRgba(color, TAG_CHIP_ALPHA), color }}
    >
      {children}
    </span>
  );
}

export function ProjectChip({
  project,
  className,
  showDot = true,
}: {
  project: ProjectSummary;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <TagChip color={project.color} className={className}>
      {showDot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
      ) : null}
      <span className="truncate">{project.name}</span>
    </TagChip>
  );
}
