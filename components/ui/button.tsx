import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-kl-accent text-kl-text-on-accent hover:bg-kl-accent-hover active:bg-kl-accent-pressed",
  secondary:
    "bg-kl-raised text-kl-text hover:bg-white/10 active:bg-white/[0.14]",
  ghost:
    "bg-transparent text-kl-text-secondary hover:bg-white/5 hover:text-kl-text",
  danger:
    "bg-kl-danger/15 text-kl-danger hover:bg-kl-danger/20 active:bg-kl-danger/25",
  link:
    "h-auto bg-transparent px-0 text-kl-accent hover:text-kl-accent-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-kl-control px-3 text-kl-meta",
  md: "h-11 gap-2 rounded-kl-control px-4 text-kl-body",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-colors duration-[var(--kl-duration-fast)] disabled:pointer-events-none disabled:opacity-55",
        variant !== "link" && sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
