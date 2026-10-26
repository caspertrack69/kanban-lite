import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/inbox", "/p/:path*", "/settings"],
};
