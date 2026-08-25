import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "thanes_lims_access_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (pathname === "/login") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
