import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { enforceAdminAccess } from "@/lib/admin-access";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from "@/lib/admin-session";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_AUTH_MAX_AGE,
  DEVICE_REQUEST_TOKEN_COOKIE,
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
  response.cookies.set(DEVICE_AUTH_COOKIE, "", opts);
  response.cookies.set(DEVICE_TOKEN_COOKIE, "", opts);
  response.cookies.set(SALESPERSON_ID_COOKIE, "", opts);
  response.cookies.set(SALESPERSON_NAME_COOKIE, "", opts);
  response.cookies.set(DEVICE_ACTOR_TYPE_COOKIE, "", opts);
  response.cookies.set(DEVICE_ACTOR_NAME_COOKIE, "", opts);
  response.cookies.set(DEVICE_REQUEST_TOKEN_COOKIE, "", opts);
}

function setDeviceAuthCookie(response: NextResponse, deviceToken: string) {
  response.cookies.set(DEVICE_AUTH_COOKIE, deviceToken, {
    path: "/",
    maxAge: DEVICE_AUTH_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  });
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const actorType = request.cookies.get(DEVICE_ACTOR_TYPE_COOKIE)?.value;
  const hasValidAdminSession = Boolean(
    verifyAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
  );
  const hasValidActorType =
    actorType === "dealer" ||
    actorType === "salesperson" ||
    actorType === "salesperson-pending";

  if (
    actorType === "dealer" &&
    (pathname.startsWith("/katalog/bien") || pathname.startsWith("/katalog/qua"))
  ) {
    return NextResponse.redirect(new URL("/katalog/gural", request.url));
  }

  const adminBlock = enforceAdminAccess(request);
  if (adminBlock) return adminBlock;

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Admin oturumu varken katalog için cihaz kilidi aranmaz.
  if (hasValidAdminSession) {
    return NextResponse.next();
  }

  const deviceToken = request.cookies.get(DEVICE_TOKEN_COOKIE)?.value;
  const authToken = request.cookies.get(DEVICE_AUTH_COOKIE)?.value;
  const hasDevice = Boolean(deviceToken);
  const hasRecentAuth = Boolean(deviceToken && authToken === deviceToken);

  if (isPublicPath(pathname)) {
    if (pathname === "/kurulum" && request.cookies.get(DEVICE_TOKEN_COOKIE)?.value && !hasValidActorType) {
      const response = NextResponse.next();
      clearDeviceCookies(response);
      return response;
    }

    if (pathname === "/kurulum" && hasDevice && deviceToken) {
      // force=1 test amaçlıdır; production'da yalnızca admin oturumu varken çalışır.
      const forceSetup =
        request.nextUrl.searchParams.get("force") === "1" &&
        (process.env.NODE_ENV !== "production" ||
          Boolean(request.cookies.get("kulalilar_admin")?.value));
      if (forceSetup) {
        return NextResponse.next();
      }
      const authorized = hasRecentAuth
        ? true
        : await isDeviceAuthorized(deviceToken);
      if (authorized) {
        const response = NextResponse.redirect(new URL("/", request.url));
        if (!hasRecentAuth) setDeviceAuthCookie(response, deviceToken);
        return response;
      }
    }
    return NextResponse.next();
  }

  // Güvenlik sertleştirmesi: eski sürümden kalma actorType'sız/bozuk cookie'ler
  // kataloga erişim vermez; cihaz yeniden kurulumdan geçmelidir.
  if (hasDevice && !hasValidActorType) {
    const response = NextResponse.redirect(new URL("/kurulum", request.url));
    clearDeviceCookies(response);
    return response;
  }

  if (!hasDevice || !deviceToken) {
    return NextResponse.redirect(new URL("/kurulum", request.url));
  }

  const authorized = hasRecentAuth
    ? true
    : await isDeviceAuthorized(deviceToken);
  if (!authorized) {
    const url = new URL("/kurulum", request.url);
    url.searchParams.set("error", DEVICE_NOT_AUTHORIZED);
    const response = NextResponse.redirect(url);
    clearDeviceCookies(response);
    return response;
  }

  const response = NextResponse.next();
  if (!hasRecentAuth) setDeviceAuthCookie(response, deviceToken);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/api/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|logos|icons|sw.js|api).*)",
  ],
};
