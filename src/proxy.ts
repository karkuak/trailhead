import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ANON_SESSION_COOKIE = "th_sid";

// Next.js 16 renamed `middleware` to `proxy`. This runs on every request to
// guarantee an analytics/experiment session id exists before any page or API
// route executes, so bucketing and event correlation are always available.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(ANON_SESSION_COOKIE)) {
    response.cookies.set(ANON_SESSION_COOKIE, crypto.randomUUID(), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
