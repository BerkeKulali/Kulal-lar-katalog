export const DEVICE_TOKEN_COOKIE = "kulalilar-device-token";
export const SALESPERSON_ID_COOKIE = "kulalilar-salesperson-id";
export const SALESPERSON_NAME_COOKIE = "kulalilar-salesperson-name";
export const DEVICE_AUTH_COOKIE = "kulalilar-device-auth";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEVICE_AUTH_MAX_AGE = 60 * 10;

export function deviceCookieOptions() {
  return {
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: false,
  };
}

export function isPublicPath(pathname: string) {
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
