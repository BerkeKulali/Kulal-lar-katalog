import { normalizeSize } from "@/lib/constants";

export type GuralPackagingRow = {
  palletM2: number;
  boxM2: number;
};

/** GÜRAL markası ölçü bazlı palet / kutu m² değerleri */
export const GURAL_PACKAGING_BY_SIZE: Record<string, GuralPackagingRow> = {
  "30x90": { palletM2: 68.04, boxM2: 1.62 },
  "60x60": { palletM2: 64.8, boxM2: 1.8 },
  "60x120": { palletM2: 60.48, boxM2: 2.16 },
  "80x80": { palletM2: 69.12, boxM2: 1.28 },
  "80x160": { palletM2: 51.2, boxM2: 2.56 },
  "20x120": { palletM2: 64.8, boxM2: 1.44 },
  "120x120": { palletM2: 51.84, boxM2: 2.88 },
};

export function guralPackagingForSize(size: string): GuralPackagingRow | null {
  return GURAL_PACKAGING_BY_SIZE[normalizeSize(size)] ?? null;
}
