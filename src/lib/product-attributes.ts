/**
 * Ürün ailesi nitelikleri: renk ve görünüm/tip. Önceden tanımlı listeler;
 * filtreleme tutarlı çalışsın diye kimlikler ASCII ve sabittir. Listeyi
 * genişletmek için buraya ekleyin (id'yi değiştirmeyin, DB'de saklanıyor).
 */

export type MaterialType = { id: string; label: string };
export type ColorOption = { id: string; label: string; hex: string };

export const MATERIAL_TYPES: MaterialType[] = [
  { id: "mermer", label: "Mermer" },
  { id: "dogaltas", label: "Doğaltaş" },
  { id: "ahsap", label: "Ahşap" },
  { id: "beton", label: "Beton" },
  { id: "dekor", label: "Dekor" },
  { id: "terrazzo", label: "Terrazzo" },
  { id: "metal", label: "Metalik" },
  { id: "duz", label: "Düz / Uni" },
];

export const COLORS: ColorOption[] = [
  { id: "beyaz", label: "Beyaz", hex: "#f4f4f5" },
  { id: "krem", label: "Krem", hex: "#efe7d6" },
  { id: "bej", label: "Bej", hex: "#dcc9a6" },
  { id: "kum", label: "Kum", hex: "#cbb489" },
  { id: "gri", label: "Gri", hex: "#9aa0a6" },
  { id: "antrasit", label: "Antrasit", hex: "#3f4145" },
  { id: "siyah", label: "Siyah", hex: "#1a1a1a" },
  { id: "kahve", label: "Kahve", hex: "#6f4e37" },
  { id: "taba", label: "Taba", hex: "#b07a4b" },
  { id: "yesil", label: "Yeşil", hex: "#7d8c74" },
  { id: "mavi", label: "Mavi", hex: "#7d94a8" },
  { id: "terrakota", label: "Terrakota", hex: "#b5651d" },
];

const MATERIAL_BY_ID = new Map(MATERIAL_TYPES.map((m) => [m.id, m]));
const COLOR_BY_ID = new Map(COLORS.map((c) => [c.id, c]));

/**
 * Anasayfada gösterilen sade alt kümeler (tam liste arama sayfası çiplerinde).
 * Sıra buradaki dizilime göredir.
 */
export const HOME_MATERIAL_TYPES: MaterialType[] = ["mermer", "dogaltas", "ahsap", "beton"]
  .map((id) => MATERIAL_BY_ID.get(id))
  .filter((m): m is MaterialType => Boolean(m));

export const HOME_COLORS: ColorOption[] = ["siyah", "beyaz", "bej", "gri"]
  .map((id) => COLOR_BY_ID.get(id))
  .filter((c): c is ColorOption => Boolean(c));

export function isMaterialType(id: string | null | undefined): boolean {
  return Boolean(id && MATERIAL_BY_ID.has(id));
}

export function isColor(id: string | null | undefined): boolean {
  return Boolean(id && COLOR_BY_ID.has(id));
}

/** Geçerli değilse null'a normalize eder (serbest/eski değerleri temizler). */
export function normalizeMaterialType(id: string | null | undefined): string | null {
  return id && MATERIAL_BY_ID.has(id) ? id : null;
}

export function normalizeColor(id: string | null | undefined): string | null {
  return id && COLOR_BY_ID.has(id) ? id : null;
}

export function materialTypeLabel(id: string | null | undefined): string | null {
  return id ? MATERIAL_BY_ID.get(id)?.label ?? null : null;
}

export function colorLabel(id: string | null | undefined): string | null {
  return id ? COLOR_BY_ID.get(id)?.label ?? null : null;
}

export function colorHex(id: string | null | undefined): string | null {
  return id ? COLOR_BY_ID.get(id)?.hex ?? null : null;
}
