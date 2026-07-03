import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";

export const ADMIN_GATE_COOKIE = "kulalilar-admin-gate";
const ADMIN_GATE_MAX_AGE = 60 * 60 * 24 * 30;

export function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

export function isTabletSession(request: NextRequest) {
  return Boolean(request.cookies.get(DEVICE_TOKEN_COOKIE)?.value);
}

function gateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_GATE_MAX_AGE,
  };
}

export function hasAdminGate(request: NextRequest) {
  const key = process.env.ADMIN_ACCESS_KEY?.trim();
  if (!key) return true;
  return request.cookies.get(ADMIN_GATE_COOKIE)?.value === key;
}

/** Tablet ve gizli anahtar kontrolü — engellenecekse yanıt döner. */
export function enforceAdminAccess(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) return null;

  if (isTabletSession(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Admin paneli tabletten erişilemez" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const accessKey = process.env.ADMIN_ACCESS_KEY?.trim();
  if (!accessKey) return null;

  if (hasAdminGate(request)) return null;

  const urlKey = request.nextUrl.searchParams.get("key");
  if (pathname === "/admin/login" && urlKey === accessKey) {
    const clean = new URL("/admin/login", request.url);
    const res = NextResponse.redirect(clean);
    res.cookies.set(ADMIN_GATE_COOKIE, accessKey, gateCookieOptions());
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return NextResponse.redirect(new URL("/", request.url));
}
