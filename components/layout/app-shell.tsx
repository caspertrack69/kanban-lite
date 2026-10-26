"use client";

import { Suspense, useState, type ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { TaskUIProvider } from "@/components/tasks/task-ui-provider";
import { MobileNav } from "./mobile-nav";
import { ProjectsSheet } from "./projects-sheet";
import { Sidebar, SidebarSkeleton } from "./sidebar";

function Shell({ children }: { children: ReactNode }) {
  const [projectsOpen, setProjectsOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-kl-bg">
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>

      <div className="lg:pl-[var(--kl-sidebar)]">
        <main className="mx-auto w-full max-w-[1440px] px-[var(--kl-gutter)] pb-28 md:px-[var(--kl-gutter-desktop)] lg:pb-10">
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <MobileNav onOpenProjects={() => setProjectsOpen(true)} />
      </Suspense>

      <ProjectsSheet
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <TaskUIProvider>
        <Shell>{children}</Shell>
      </TaskUIProvider>
    </AuthGate>
  );
}
