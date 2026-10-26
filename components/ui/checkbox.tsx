"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-kl-checkbox border transition-colors duration-[var(--kl-duration-fast)] before:absolute before:-inset-3.5 before:content-[''] disabled:cursor-not-allowed disabled:opacity-55",
        checked
          ? "border-kl-accent bg-kl-accent text-kl-text-on-accent"
          : "border-white/45 bg-transparent text-transparent hover:border-white/70",
        className,
      )}
    >
      <Check aria-hidden="true" className="size-3" strokeWidth={2} />
    </button>
  );
}
