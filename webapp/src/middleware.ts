import { NextResponse, type NextRequest } from "next/server";

const adminCookieName = "scc_admin_session";
const publicFiles = /\.(.*)$/;

async function adminPasswordHash() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return null;
  }

  const encodedPassword = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encodedPassword);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

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
  const expectedHash = await adminPasswordHash();
  const sessionHash = request.cookies.get(adminCookieName)?.value;
  const isLoggedIn = Boolean(expectedHash && sessionHash === expectedHash);

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
