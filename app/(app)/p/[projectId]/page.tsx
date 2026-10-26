import { Suspense } from "react";
import type { Metadata } from "next";
import {
  BacklogPage,
  BacklogPageSkeleton,
} from "@/components/lists/backlog-page";

// The client session gate intentionally renders before page content.
export const instant = false;

export const metadata: Metadata = {
  title: "Backlog",
};

export default function Page() {
  return (
    <Suspense fallback={<BacklogPageSkeleton />}>
      <BacklogPage />
    </Suspense>
  );
}
