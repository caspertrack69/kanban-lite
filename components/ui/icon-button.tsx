import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function IconButton({
  label,
  variant = "ghost",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  label: string;
  variant?: "ghost" | "raised" | "danger";
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-kl-control transition-colors duration-[var(--kl-duration-fast)] disabled:pointer-events-none disabled:opacity-50",
        variant === "ghost" &&
          "text-kl-text-muted hover:bg-white/5 hover:text-kl-text",
        variant === "raised" &&
          "bg-kl-raised text-kl-text-secondary hover:bg-white/10 hover:text-kl-text",
        variant === "danger" &&
          "text-kl-danger hover:bg-kl-danger/15",
        className,
      )}
      {...props}
    />
  );
}
