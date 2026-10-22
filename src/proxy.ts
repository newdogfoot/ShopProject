import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: without a session cookie, protected pages redirect to
 * the login page. Every page and server action still verifies the session.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sid")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/learn/:path*"],
};
