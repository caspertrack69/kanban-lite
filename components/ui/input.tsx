import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldBase =
  "w-full rounded-kl-control border border-transparent bg-kl-raised text-kl-text outline-none transition-colors duration-[var(--kl-duration-fast)] placeholder:text-kl-text-disabled hover:bg-white/[0.06] focus-visible:border-kl-accent aria-[invalid=true]:border-kl-danger disabled:cursor-not-allowed disabled:opacity-55";

export function Input({
  className,
  type = "text",
  variant = "default",
  ...props
}: ComponentProps<"input"> & { variant?: "default" | "bare" }) {
  return (
    <input
      type={type}
      className={cn(
        variant === "default"
          ? cn(fieldBase, "h-11 px-3.5 text-kl-body")
          : "w-full rounded-kl-sm border border-transparent bg-transparent py-1 text-kl-text outline-none transition-colors duration-[var(--kl-duration-fast)] placeholder:text-kl-text-disabled hover:border-kl-border focus-visible:border-kl-accent disabled:cursor-not-allowed disabled:text-kl-text-disabled",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  rows = 3,
  variant = "default",
  ...props
}: ComponentProps<"textarea"> & { variant?: "default" | "bare" }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        variant === "default"
          ? cn(fieldBase, "min-h-24 resize-y px-3.5 py-3 text-kl-body")
          : "w-full resize-y rounded-kl-sm border border-transparent bg-transparent py-1 text-kl-text outline-none transition-colors duration-[var(--kl-duration-fast)] placeholder:text-kl-text-disabled hover:border-kl-border focus-visible:border-kl-accent disabled:cursor-not-allowed disabled:text-kl-text-disabled",
        className,
      )}
      {...props}
    />
  );
}
