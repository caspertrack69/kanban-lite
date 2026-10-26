import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { BACKGROUND_COLOR } from "@/lib/design-tokens.generated";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kanban Lite",
    template: "%s · Kanban Lite",
  },
  description:
    "A focused single-user kanban for capturing ideas from Telegram and keeping the active board small.",
  applicationName: "Kanban Lite",
};

export const viewport: Viewport = {
  themeColor: BACKGROUND_COLOR,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-kl-bg font-kl text-kl-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
