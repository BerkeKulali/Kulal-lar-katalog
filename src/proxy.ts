import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";
import {
  DEVICE_NOT_AUTHORIZED,
  isDeviceAuthorized,
} from "@/lib/device-lock";

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

function clearDeviceCookies(response: NextResponse) {
  const opts = { path: "/", maxAge: 0 };
  response.cookies.set(DEVICE_TOKEN_COOKIE, "", opts);
  response.cookies.set(SALESPERSON_ID_COOKIE, "", opts);
  response.cookies.set(SALESPERSON_NAME_COOKIE, "", opts);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminBlock = enforceAdminAccess(request);
  if (adminBlock) return adminBlock;

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const deviceToken = request.cookies.get(DEVICE_TOKEN_COOKIE)?.value;
  const hasDevice = Boolean(deviceToken);

  if (isPublicPath(pathname)) {
    if (pathname === "/kurulum" && hasDevice && deviceToken) {
      const authorized = await isDeviceAuthorized(deviceToken);
      if (authorized) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!hasDevice || !deviceToken) {
    return NextResponse.redirect(new URL("/kurulum", request.url));
  }

  const authorized = await isDeviceAuthorized(deviceToken);
  if (!authorized) {
    const url = new URL("/kurulum", request.url);
    url.searchParams.set("error", DEVICE_NOT_AUTHORIZED);
    const response = NextResponse.redirect(url);
    clearDeviceCookies(response);
    return response;
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
