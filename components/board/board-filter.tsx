"use client";

import type { ProjectDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

export function BoardFilter({
  projects,
  value,
  onChange,
}: {
  projects: ProjectDTO[];
  value: number | null;
  onChange: (projectId: number | null) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Filter board by project"
      className="kl-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
    >
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={cn(
          "inline-flex h-8 shrink-0 items-center rounded-kl-full border px-3 text-kl-tag font-medium transition-colors duration-[var(--kl-duration-fast)]",
          value === null
            ? "border-white/10 bg-kl-raised text-kl-text"
            : "border-kl-border text-kl-text-muted hover:border-white/10 hover:text-kl-text-secondary",
        )}
      >
        All
      </button>
      {projects.map((project) => {
        const active = value === project.id;
        return (
          <button
            key={project.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : project.id)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-kl-full border px-3 text-kl-tag font-medium transition-colors duration-[var(--kl-duration-fast)]",
              active
                ? "border-white/10 bg-kl-raised text-kl-text"
                : "border-kl-border text-kl-text-muted hover:border-white/10 hover:text-kl-text-secondary",
            )}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: project.color }}
            />
            {project.name}
          </button>
        );
      })}
    </div>
  );
}
