export type SaleMode = "m2" | "pallet" | "truck";

export type PalletVisualState = {
  /** 0–1 doluluk (görsel) */
  fill: number;
  /** Tam palet adedi (5x gibi) */
  multiplier: number | null;
  /** Gösterilecek etiket: null, "5x", "5,5x" */
  label: string | null;
};

const EPS = 0.005;

/** Palet ikonu dolum adımı (0–1 arası 30 kademe) */
export const PALLET_FILL_STEPS = 30;

export function quantizePalletFill(fill: number): number {
  if (fill <= 0) return 0;
  if (fill >= 1) return 1;
  return Math.round(fill * PALLET_FILL_STEPS) / PALLET_FILL_STEPS;
}

export function packCount(quantityM2: number, unitM2: number | null | undefined) {
  if (!unitM2 || unitM2 <= 0 || quantityM2 <= 0) return null;
  const n = quantityM2 / unitM2;
  return Math.round(n * 10) / 10;
}

export function formatPackCount(count: number | null) {
  if (count == null) return "—";
  return Number.isInteger(count) ? String(count) : count.toFixed(1).replace(".", ",");
}

export function formatUnitM2(value: number | null | undefined) {
  if (value == null || value <= 0) return "—";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded} m²` : `${rounded} m²`;
}

export function formatPackMultiplier(value: number) {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}x`;
  return `${rounded.toFixed(1).replace(".", ",")}x`;
}

/** Miktara göre palet doluluk oranı ve çarpan etiketi */
export function palletVisualState(
  quantityM2: number,
  palletM2: number | null | undefined
): PalletVisualState | null {
  if (!palletM2 || palletM2 <= 0) return null;
  if (quantityM2 <= 0) {
    return { fill: 0, multiplier: null, label: null };
  }

  const ratio = quantityM2 / palletM2;

  if (ratio >= 1 - EPS) {
    return {
      fill: 1,
      multiplier: Math.floor(ratio + EPS),
      label: formatPackMultiplier(ratio),
    };
  }

  return {
    fill: quantizePalletFill(ratio),
    multiplier: null,
    label: null,
  };
}

/** Palet / tır satışında m²'yi birim katına yuvarlar */
export function quantityForSaleMode(
  quantityM2: number,
  mode: SaleMode,
  palletM2: number | null | undefined,
  truckM2: number | null | undefined
) {
  if (mode === "pallet" && palletM2 && palletM2 > 0) {
    return Math.ceil(quantityM2 / palletM2) * palletM2;
  }
  if (mode === "truck" && truckM2 && truckM2 > 0) {
    return Math.ceil(quantityM2 / truckM2) * truckM2;
  }
  return quantityM2;
}
