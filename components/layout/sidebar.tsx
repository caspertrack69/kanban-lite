"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutGrid,
  LogOut,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/brand";
import { cn } from "@/lib/cn";
import { useLogout, useProjects } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIconLink({
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
      title={label}
      className={cn(
        "group relative flex size-11 items-center justify-center rounded-kl-control transition-colors duration-[var(--kl-duration-fast)]",
        active
          ? "text-kl-text"
          : "text-kl-text-muted hover:bg-white/5 hover:text-kl-text",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute -left-3.5 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-kl-full bg-kl-accent"
        />
      ) : null}
      {children}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useProjects();
  const logout = useLogout();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--kl-sidebar)] flex-col border-r border-kl-divider bg-kl-bg py-5 lg:flex">
      <div className="flex justify-center">
        <Link href="/" aria-label="Kanban Lite home">
          <LogoMark />
        </Link>
      </div>

      <nav aria-label="Main" className="mt-7 flex flex-col items-center gap-2">
        <NavIconLink href="/" label="Board" active={isActive(pathname, "/")}>
          <LayoutGrid aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </NavIconLink>
        <NavIconLink
          href="/inbox"
          label="Inbox"
          active={isActive(pathname, "/inbox")}
        >
          <Inbox aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </NavIconLink>
      </nav>

      <div className="mx-4 mt-5 h-px bg-kl-divider" />

      <nav
        aria-label="Projects"
        className="kl-scrollbar mt-4 flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2"
      >
        {projects.isPending
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="size-8 rounded-kl-sm" />
            ))
          : projects.data?.map((project) => {
              const active = pathname === `/p/${project.id}`;
              return (
                <Link
                  key={project.id}
                  href={`/p/${project.id}`}
                  aria-label={`Open ${project.name} backlog`}
                  aria-current={active ? "page" : undefined}
                  title={project.name}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-kl-control transition-colors duration-[var(--kl-duration-fast)]",
                    active ? "bg-white/[0.07]" : "hover:bg-white/5",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "rounded-[3px] transition-all",
                      active ? "size-3" : "size-2.5",
                    )}
                    style={{ backgroundColor: project.color }}
                  />
                </Link>
              );
            })}
      </nav>

      <div className="mt-3 flex flex-col items-center gap-2">
        <NavIconLink
          href="/settings"
          label="Settings"
          active={isActive(pathname, "/settings")}
        >
          <Settings aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </NavIconLink>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => router.replace("/login"),
            })
          }
          className="flex size-11 items-center justify-center rounded-kl-control text-kl-text-muted transition-colors duration-[var(--kl-duration-fast)] hover:bg-white/5 hover:text-kl-danger disabled:opacity-50"
        >
          <LogOut aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="fixed inset-y-0 left-0 z-30 hidden w-[var(--kl-sidebar)] flex-col items-center gap-4 border-r border-kl-divider bg-kl-bg py-5 lg:flex">
      <Skeleton className="size-10 rounded-kl-full" />
      <Skeleton className="mt-3 size-11 rounded-kl-control" />
      <Skeleton className="size-11 rounded-kl-control" />
    </div>
  );
}
