/**
 * Katalog okuma sorguları Next.js Data Cache ile önbelleklenir (Turso round-trip'i
 * her navigasyonda tekrarlanmasın). İçerik değiştiğinde ilgili etiket
 * `revalidateTag` ile geçersiz kılınır; ayrıca `revalidate` süresi kendi kendini
 * onarır (bir invalidasyon atlanırsa en fazla bu süre kadar bayat kalır).
 *
 * Not: Fiyat/görsel/stok için istemci sync store yetkili kaynaktır; SSR verisi
 * yalnızca ilk boyamada kullanılır, bu yüzden bu önbellek kullanıcıya bayatlık
 * olarak yansımaz.
 */
import { revalidateTag } from "next/cache";

export const CATALOG_TAG = "catalog";
export const SALESPERSON_TAG = "salespeople";

export const CATALOG_REVALIDATE_SECONDS = 300;
export const SALESPERSON_REVALIDATE_SECONDS = 60;

// Admin mutasyonlarından sonra sonraki katalog ziyaretinde taze SSR verisi için
// anında sona erdir (Next 16 iki argümanlı imza).
const IMMEDIATE_EXPIRE = { expire: 0 } as const;

/** Katalog Data Cache'ini geçersiz kıl (CLI dışında sessizce). */
export function invalidateCatalogCache() {
  try {
    revalidateTag(CATALOG_TAG, IMMEDIATE_EXPIRE);
  } catch {
    // revalidateTag yalnızca request bağlamında çalışır; script/CLI'da sessiz geç.
  }
}

/** Plasiyer stok yetkisi önbelleğini geçersiz kıl. */
export function invalidateSalespersonCache() {
  try {
    revalidateTag(SALESPERSON_TAG, IMMEDIATE_EXPIRE);
  } catch {
    // request bağlamı dışında sessiz geç.
  }
}
