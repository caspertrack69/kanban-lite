import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-kl-meta font-medium text-kl-text-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-kl-meta text-kl-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-kl-meta text-kl-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
