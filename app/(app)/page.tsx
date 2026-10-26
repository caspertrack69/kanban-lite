import type { Metadata } from "next";
import { BoardPage } from "@/components/board/board-page";

// The client session gate intentionally renders before page content.
export const instant = false;

export const metadata: Metadata = {
  title: "Board",
};

export default function Page() {
  return <BoardPage />;
}
