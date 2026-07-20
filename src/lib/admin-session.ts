import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "kulalilar_admin";

/** Oturum süreleri (saniye). */
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 saat
export const ADMIN_SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

export const SESSION_SECRET_MISSING =
  "SESSION_SECRET tanımlı değil; admin oturumları imzalanamıyor. " +
  "Ortam değişkenlerine en az 32 karakterlik rastgele bir değer ekleyin.";

const MIN_SECRET_LENGTH = 32;

/**
 * Oturum imzalama sırrı. Daha önce DATABASE_AUTH_TOKEN'a düşen bir fallback
 * vardı; kaldırıldı çünkü (a) veritabanı token'ı rotasyona girdiğinde tüm
 * admin oturumları sessizce düşüyordu, (b) kimlik doğrulama sırrı ile veri
 * erişim sırrı birbirine bağlanıyordu.
 */
function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) return null;
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET en az ${MIN_SECRET_LENGTH} karakter olmalı (şu an ${secret.length}).`
    );
  }
  return secret;
}

/** Ortam yapılandırması admin girişine izin veriyor mu? */
export function isSessionSecretConfigured(): boolean {
  try {
    return sessionSecret() !== null;
  } catch {
    return false;
  }
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
  maxAgeSeconds: number,
  passwordChangedAt: Date
): string {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error(SESSION_SECRET_MISSING);
  }
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const issuedFor = Math.floor(passwordChangedAt.getTime() / 1000);
  const payload = `${adminId}.${expiresAt}.${issuedFor}`;
  return `${payload}.${sign(payload, secret)}`;
}

export type AdminSessionClaims = {
  adminId: string;
  /** Token üretildiğinde geçerli olan passwordChangedAt (epoch saniye). */
  issuedFor: number;
};

/**
 * İmzayı ve son kullanma tarihini doğrular. DB'ye BAKMAZ — middleware'de
 * ucuz kalması için. Şifre değişikliğiyle iptal kontrolü getAdminSession()
 * içinde, kullanıcı zaten DB'den okunurken yapılır.
 */
export function verifyAdminSessionClaims(
  value: string | undefined | null
): AdminSessionClaims | null {
  if (!value) return null;

  let secret: string | null;
  try {
    secret = sessionSecret();
  } catch {
    // Yanlış yapılandırılmış sır: çökmek yerine oturumu geçersiz say.
    return null;
  }
  if (!secret) return null;

  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [adminId, expiresAtRaw, issuedForRaw, signature] = parts;
  if (!adminId || !expiresAtRaw || !issuedForRaw || !signature) return null;

  const expected = sign(
    `${adminId}.${expiresAtRaw}.${issuedForRaw}`,
    secret
  );
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return null;

  const issuedFor = Number(issuedForRaw);
  if (!Number.isFinite(issuedFor)) return null;

  return { adminId, issuedFor };
}

/** Geçerli ve süresi dolmamış imzalı oturumdan adminId döner; aksi halde null. */
export function verifyAdminSessionValue(
  value: string | undefined | null
): string | null {
  return verifyAdminSessionClaims(value)?.adminId ?? null;
}

/**
 * Token, kullanıcının güncel passwordChangedAt değeriyle uyuşuyor mu?
 * Şifre değiştiğinde eldeki tüm "beni hatırla" cookie'leri geçersizleşir.
 */
export function isSessionCurrent(
  claims: AdminSessionClaims,
  passwordChangedAt: Date
): boolean {
  return claims.issuedFor === Math.floor(passwordChangedAt.getTime() / 1000);
}
