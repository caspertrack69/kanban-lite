import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";

// The client session gate intentionally renders before page content.
export const instant = false;

export const metadata: Metadata = {
  title: "Board",
};

export default function Page() {
  return (
    <>
      <PageHeader
        title="Board"
        section="Board"
        description="Todo, Doing, and Done across every project."
      />
      <div className="rounded-kl-card border border-kl-border bg-kl-card p-6 text-kl-body text-kl-text-secondary">
        The interactive board is added in the next commit.
      </div>
    </>
  );
}
