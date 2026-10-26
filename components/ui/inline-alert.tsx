import type { ReactNode } from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function InlineAlert({
  children,
  variant = "danger",
  className,
}: {
  children: ReactNode;
  variant?: "danger" | "info";
  className?: string;
}) {
  const Icon = variant === "danger" ? AlertCircle : Info;

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-kl-control px-3.5 py-3 text-kl-body",
        variant === "danger"
          ? "bg-kl-danger/10 text-kl-danger"
          : "bg-kl-raised text-kl-text-secondary",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.5}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
