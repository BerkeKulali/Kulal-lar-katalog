import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enforceAdminAccess } from "@/lib/admin-access";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";

function isPublicPath(pathname: string) {
  return (
    pathname === "/kurulum" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/logos/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/sw.js"
  );
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminBlock = enforceAdminAccess(request);
  if (adminBlock) return adminBlock;

  // Admin paneli ofis tarayıcısından açılır; tablet kurulumu gerekmez.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const hasDevice = Boolean(request.cookies.get(DEVICE_TOKEN_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    if (pathname === "/kurulum" && hasDevice) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasDevice) {
    return NextResponse.redirect(new URL("/kurulum", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/api/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|logos|icons|sw.js|api).*)",
  ],
};
