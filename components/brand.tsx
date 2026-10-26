import { cn } from "@/lib/cn";

export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-kl-full border border-kl-border bg-kl-raised font-medium tracking-kl-title text-kl-text",
        size === "sm" && "size-8 text-kl-tag",
        size === "md" && "size-10 text-kl-body",
        size === "lg" && "size-12 text-kl-section-title",
        className,
      )}
    >
      KL
    </span>
  );
}
