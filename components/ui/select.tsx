"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDialogLayer } from "./dialog";

export const NO_SELECTION = "__none__";

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled,
  name,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
}) {
  const dialogElement = useDialogLayer();

  return (
    <RadixSelect.Root
      name={name}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "group flex h-11 w-full items-center justify-between gap-2 rounded-kl-control border border-transparent bg-kl-raised px-3.5 text-left text-kl-body text-kl-text outline-none transition-colors duration-[var(--kl-duration-fast)]",
          "hover:bg-white/[0.06] focus-visible:border-kl-accent data-[state=open]:border-kl-accent",
          "disabled:pointer-events-none disabled:opacity-55",
          className,
        )}
      >
        <RadixSelect.Value
          className="min-w-0 flex-1 truncate"
          placeholder={
            <span className="text-kl-text-disabled">{placeholder}</span>
          }
        />
        <RadixSelect.Icon asChild>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-kl-text-muted transition-transform duration-[var(--kl-duration-fast)] group-data-[state=open]:rotate-180"
            strokeWidth={1.5}
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal container={dialogElement ?? undefined}>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-[60] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-kl-md border border-kl-border bg-[#262626] p-1 text-kl-text shadow-kl-overlay",
            contentClassName,
          )}
        >
          <RadixSelect.ScrollUpButton className="flex h-6 items-center justify-center text-kl-text-muted">
            <ChevronUp
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.5}
            />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="kl-scrollbar">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-9 cursor-default select-none items-center rounded-kl-sm py-2 pl-3 pr-9 text-kl-body text-kl-text-secondary outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-kl-text data-[state=checked]:text-kl-text"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5 inline-flex size-4 items-center justify-center text-kl-accent">
                  <Check
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={2}
                  />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex h-6 items-center justify-center text-kl-text-muted">
            <ChevronDown
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={1.5}
            />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
