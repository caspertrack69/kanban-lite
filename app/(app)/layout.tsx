import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// The protected shell deliberately renders its client session gate before the
// page content, so opt this subtree out of instant-navigation validation.
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
