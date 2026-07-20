export const DEVICE_TOKEN_COOKIE = "kulalilar-device-token";
export const SALESPERSON_ID_COOKIE = "kulalilar-salesperson-id";
export const SALESPERSON_NAME_COOKIE = "kulalilar-salesperson-name";
export const DEVICE_ACTOR_TYPE_COOKIE = "kulalilar-device-actor-type";
export const DEVICE_ACTOR_NAME_COOKIE = "kulalilar-device-actor-name";
export const DEVICE_AUTH_COOKIE = "kulalilar-device-auth";
export const DEVICE_REQUEST_TOKEN_COOKIE = "kulalilar-device-request-token";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEVICE_AUTH_MAX_AGE = 60 * 10;

/**
 * LAN kurulumunda (http://192.168.x.x:3000) secure cookie tarayıcıya hiç
 * yazılmaz; bu yüzden secure yalnızca production'da açılır.
 */
const secureCookies = () => process.env.NODE_ENV === "production";

/**
 * Cihaz token'ı: kataloğa erişimin tek anahtarı. httpOnly — JS'ten okunamaz,
 * dolayısıyla bir XSS token'ı çalamaz. İstemcinin token'a ihtiyacı yok;
 * sunucu her istekte cookie'den doğruluyor.
 */
export function deviceTokenCookieOptions() {
  return {
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: secureCookies(),
  };
}

/**
 * Gösterim amaçlı cihaz cookie'leri (aktör tipi/adı, plasiyer adı).
 * Gizli bilgi taşımazlar; arayüzün okuyabilmesi için httpOnly değiller.
 */
export function deviceCookieOptions() {
  return {
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: secureCookies(),
  };
}

export function isPublicPath(pathname: string) {
  return (
    pathname === "/kurulum" ||
    // Service worker'ın çevrimdışı yedeği; cihaz kaydı olmadan da açılmalı.
    pathname === "/offline" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/logos/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/sw.js"
  );
}
