import type { Metadata } from "next";
import { InboxPage } from "@/components/lists/inbox-page";

// The client session gate intentionally renders before page content.
export const instant = false;

export const metadata: Metadata = {
  title: "Inbox",
};

export default function Page() {
  return <InboxPage />;
}
