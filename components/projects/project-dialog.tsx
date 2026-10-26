"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { ProjectChip } from "@/components/ui/tag-chip";
import {
  PROJECT_COLORS,
  PROJECT_COLOR_NAMES,
  type ProjectColor,
} from "@/lib/design-tokens.generated";
import { messageForError } from "@/lib/errors";
import { useCreateProject, useUpdateProject } from "@/lib/hooks";
import type { ProjectDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ProjectDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: ProjectDTO | null;
}) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const wasOpen = useRef(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>(PROJECT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(project?.name ?? "");
      setColor((project?.color as ProjectColor) ?? PROJECT_COLORS[0]);
      setError(null);
    }
    wasOpen.current = open;
  }, [open, project]);

  const pending = createProject.isPending || updateProject.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("Project name is required.");
      return;
    }

    if (project) {
      updateProject.mutate(
        { id: project.id, input: { name: name.trim(), color } },
        {
          onSuccess: () => onClose(),
          onError: (mutationError) => setError(messageForError(mutationError)),
        },
      );
    } else {
      createProject.mutate(
        { name: name.trim(), color },
        {
          onSuccess: () => onClose(),
          onError: (mutationError) => setError(messageForError(mutationError)),
        },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      description="Projects group your backlog and give cards their color."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="project-form"
            variant="primary"
            disabled={pending}
          >
            {pending ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin"
                strokeWidth={1.5}
              />
            ) : null}
            {project ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" className="space-y-5" onSubmit={handleSubmit}>
        <Field label="Name" htmlFor="project-name">
          <Input
            id="project-name"
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Website refresh"
            autoComplete="off"
          />
        </Field>

        <div className="space-y-2">
          <span className="block text-kl-meta font-medium text-kl-text-muted">
            Color
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Project color">
            {PROJECT_COLORS.map((swatch) => {
              const active = color === swatch;
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={PROJECT_COLOR_NAMES[swatch]}
                  aria-pressed={active}
                  onClick={() => setColor(swatch)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-kl-full border-2 transition-transform duration-[var(--kl-duration-fast)]",
                    active
                      ? "scale-105 border-kl-text"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  {active ? (
                    <Check
                      aria-hidden="true"
                      className="size-4 text-white"
                      strokeWidth={2}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-kl-control bg-kl-raised/60 p-3">
          <span className="mb-2 block text-kl-meta text-kl-text-muted">
            Preview
          </span>
          <ProjectChip
            project={{
              id: project?.id ?? 0,
              name: name.trim().length > 0 ? name.trim() : "Project name",
              color,
            }}
          />
        </div>

        {error ? <InlineAlert>{error}</InlineAlert> : null}
      </form>
    </Dialog>
  );
}
