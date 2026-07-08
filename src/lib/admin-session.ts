import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "kulalilar_admin";

/** Oturum süreleri (saniye). */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 saat
export const ADMIN_SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

function sessionSecret(): string | null {
  const secret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.DATABASE_AUTH_TOKEN?.trim();
  return secret || null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * İmzalı oturum değeri üretir: `<adminId>.<expiresAtEpochSec>.<hmac>`.
 * Cookie süresinden bağımsız mutlak bir son kullanma tarihi taşır.
 */
export function createAdminSessionValue(
  adminId: string,
  maxAgeSeconds: number
): string {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET (veya DATABASE_AUTH_TOKEN) tanımlı değil; admin oturumu imzalanamıyor"
    );
  }
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${adminId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Geçerli ve süresi dolmamış imzalı oturumdan adminId döner; aksi halde null. */
export function verifyAdminSessionValue(
  value: string | undefined | null
): string | null {
  if (!value) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expiresAtRaw, signature] = parts;
  if (!adminId || !expiresAtRaw || !signature) return null;

  const expected = sign(`${adminId}.${expiresAtRaw}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return null;

  return adminId;
}
