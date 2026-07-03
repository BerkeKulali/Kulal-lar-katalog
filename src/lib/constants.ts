export const BRAND_SLUGS = ["qua", "bien", "gural"] as const;

export const TILE_SIZES = [
  "20x120",
  "30x60",
  "30x90",
  "40x120",
  "60x60",
  "60x120",
  "80x160",
  "80x80",
  "100x100",
  "120x120",
] as const;

export type TileSize = (typeof TILE_SIZES)[number];

export const BASE_SURFACES = ["MAT", "SLP", "FLP"] as const;

/** Tüm yüzey kodları (marka özel olanlar dahil) */
export const SURFACES = [
  "MAT",
  "SLP",
  "FLP",
  "SUG",
  "GLS",
  "SOFT_ANTISLIP",
  "ANTISLIP",
] as const;

export const SURFACE_LABELS: Record<string, string> = {
  MAT: "MAT — Mat",
  SLP: "SLP — Yarı mat (semi lappato)",
  FLP: "FLP — Parlak (lappato)",
  SUG: "SUG — Sugar effect",
  GLS: "GLS — Glossy",
  SOFT_ANTISLIP: "Soft Antislip",
  ANTISLIP: "Antislip",
};

const BRAND_EXTRA_SURFACES: Record<string, readonly string[]> = {
  gural: ["SUG", "GLS", "SOFT_ANTISLIP", "ANTISLIP"],
};

/** Markanın kullanabileceği yüzey kodları */
export function getSurfacesForBrand(brandSlug: string): string[] {
  const slug = brandSlug.trim().toLowerCase();
  const extras = BRAND_EXTRA_SURFACES[slug] ?? [];
  return [...BASE_SURFACES, ...extras];
}

export function getSurfaceOptionsForBrand(brandSlug: string) {
  return getSurfacesForBrand(brandSlug).map((id) => ({
    id,
    label: SURFACE_LABELS[id] ?? id,
  }));
}

export function isValidSurfaceForBrand(brandSlug: string, surface: string) {
  return getSurfacesForBrand(brandSlug).includes(surface.toUpperCase());
}

export function surfaceDisplayLabel(surface: string) {
  return SURFACE_LABELS[surface] ?? surface;
}

export const SIZE_LAYOUT: Record<
  string,
  { columns: 1 | 2; perPage: number; aspect: string }
> = {
  "20x120": { columns: 2, perPage: 6, aspect: "6/1" },
  "30x60": { columns: 2, perPage: 4, aspect: "2/1" },
  "30x90": { columns: 2, perPage: 6, aspect: "3/1" },
  "40x120": { columns: 2, perPage: 6, aspect: "3/1" },
  "60x60": { columns: 2, perPage: 4, aspect: "1/1" },
  "60x120": { columns: 2, perPage: 6, aspect: "2/1" },
  "80x160": { columns: 2, perPage: 6, aspect: "2/1" },
  "80x80": { columns: 2, perPage: 6, aspect: "1/1" },
  "100x100": { columns: 2, perPage: 4, aspect: "1/1" },
  "120x120": { columns: 2, perPage: 4, aspect: "1/1" },
};

export const DEFAULT_LAYOUT = { columns: 1 as const, perPage: 4, aspect: "1/1" };

/** Seramik plakası yatay gösterim: uzun kenar genişlik, kısa kenar yükseklik (banner-studio 2:1) */
export function aspectForSize(size: string): string {
  const normalized = normalizeSize(size);
  const match = normalized.match(/^(\d+)x(\d+)$/);
  if (!match) return "1/1";

  const w = Number(match[1]);
  const h = Number(match[2]);
  if (w === h) return "1/1";

  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return `${long}/${short}`;
}

export function getSizeLayout(size: string) {
  const normalized = normalizeSize(size);
  const layout = SIZE_LAYOUT[normalized] ?? DEFAULT_LAYOUT;
  return { ...layout, aspect: aspectForSize(normalized) };
}

export function normalizeSize(size: string) {
  return size.toLowerCase().replace(/\s+/g, "");
}

export function formatSizeLabel(size: string) {
  return normalizeSize(size).toUpperCase();
}

/** Görüntüleme: 60 × 120 */
export function formatSizeDisplay(size: string) {
  const normalized = normalizeSize(size);
  const parts = normalized.split("x");
  if (parts.length !== 2) return formatSizeLabel(size);
  return `${parts[0]} × ${parts[1]}`;
}
