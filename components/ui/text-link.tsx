import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const className =
  "inline-flex items-center gap-1 text-kl-body font-medium text-kl-text-link transition-colors duration-[var(--kl-duration-fast)] hover:text-kl-accent-hover";

export function TextLink({
  href,
  className: extra,
  children,
  ...props
}: { href: string; children: ReactNode } & Omit<
  ComponentProps<typeof Link>,
  "href" | "children"
>) {
  return (
    <Link href={href} className={cn(className, extra)} {...props}>
      {children}
    </Link>
  );
}
