import { aspectForSize, getSizeLayout, normalizeSize } from "@/lib/constants";

export type TileImageContext = "list" | "detail";

export type TileImageProfile = {
  aspect: string;
  cloudWidth: number;
};

/** Uzun şerit ölçüler (yatay banner gösterim) */
export const STRIP_TILE_SIZES = [
  "20x120",
  "30x90",
  "40x120",
  "60x120",
  "80x160",
] as const;

export function isStripTileSize(size?: string | null) {
  if (!size) return false;
  return (STRIP_TILE_SIZES as readonly string[]).includes(normalizeSize(size));
}

/**
 * Cloudinary genişliği — kaynak 14k olsa bile ekranda net görünsün (Retina dahil).
 * Liste 2 sütun: kart ~%45 genişlik → w_1200 yeterli.
 * Detay tam genişlik: w_2400.
 */
export function tileImageProfile(
  size?: string | null,
  context: TileImageContext = "list"
): TileImageProfile {
  const normalized = size ? normalizeSize(size) : "";
  const aspect = aspectForSize(normalized || "60x60");
  const strip = isStripTileSize(normalized);
  const columns = normalized ? getSizeLayout(normalized).columns : 2;

  let cloudWidth: number;
  if (context === "detail") {
    cloudWidth = strip ? 2400 : 1600;
  } else if (strip && columns === 2) {
    cloudWidth = 1200;
  } else if (strip) {
    cloudWidth = 2000;
  } else {
    cloudWidth = columns === 2 ? 1000 : 1400;
  }

  return { aspect, cloudWidth };
}
