import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

// The client session gate intentionally renders before page content.
export const instant = false;

export const metadata: Metadata = {
  title: "Settings",
};

export default function Page() {
  return <SettingsPage />;
}
