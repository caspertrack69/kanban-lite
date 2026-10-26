"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Inbox, LayoutGrid, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTaskUI } from "@/components/tasks/task-ui-provider";

function MobileItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-kl-tag-m font-medium transition-colors",
        active ? "text-kl-text" : "text-kl-text-muted",
      )}
    >
      {children}
      <span>{label}</span>
      {active ? (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 h-0.5 w-5 rounded-kl-full bg-kl-accent"
        />
      ) : null}
    </Link>
  );
}

export function MobileNav({
  onOpenProjects,
}: {
  onOpenProjects: () => void;
}) {
  const pathname = usePathname();
  const { openCreate } = useTaskUI();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-kl-sheet border-t border-kl-divider bg-kl-bg lg:hidden"
    >
      <div className="kl-safe-bottom grid h-[72px] grid-cols-5 items-center px-2">
        <MobileItem href="/" label="Board" active={pathname === "/"}>
          <LayoutGrid aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </MobileItem>
        <MobileItem
          href="/inbox"
          label="Inbox"
          active={pathname === "/inbox"}
        >
          <Inbox aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </MobileItem>

        <div className="relative flex h-full items-center justify-center">
          <button
            type="button"
            aria-label="Add task"
            onClick={() => openCreate({ status: "todo" })}
            className="absolute -top-6 flex size-[var(--kl-fab)] items-center justify-center rounded-kl-full bg-kl-accent text-kl-text-on-accent shadow-kl-fab transition-transform duration-[var(--kl-duration-fast)] active:scale-95"
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="button"
          aria-label="Projects"
          aria-current={pathname.startsWith("/p/") ? "page" : undefined}
          onClick={onOpenProjects}
          className={cn(
            "relative flex min-h-[44px] flex-col items-center justify-center gap-1 text-kl-tag-m font-medium",
            pathname.startsWith("/p/")
              ? "text-kl-text"
              : "text-kl-text-muted",
          )}
        >
          <FolderKanban
            aria-hidden="true"
            className="size-5"
            strokeWidth={1.5}
          />
          <span>Projects</span>
          {pathname.startsWith("/p/") ? (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 h-0.5 w-5 rounded-kl-full bg-kl-accent"
            />
          ) : null}
        </button>
        <MobileItem
          href="/settings"
          label="Settings"
          active={pathname === "/settings"}
        >
          <Settings aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </MobileItem>
      </div>
    </nav>
  );
}
