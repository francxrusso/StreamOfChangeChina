import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, verifySessionToken } from "@/lib/auth-session";

const publicFiles = /\.(.*)$/;

function isPublicPath(pathname: string) {
  return (
    pathname === "/accesso" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.png" ||
    publicFiles.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(authCookieName)?.value);
  const isLoggedIn = Boolean(session);

  if (isLoggedIn && pathname === "/accesso") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isLoggedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/accesso", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"]
};
