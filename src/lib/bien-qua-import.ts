import { normalizeSize } from "@/lib/constants";
import { parseSurface } from "@/lib/utils";
import type { Surface } from "@/generated/prisma/client";
import type { PriceImportRow } from "@/lib/price-import";

export type SupplierBrandSlug = "bien" | "qua";

export type SupplierPriceColumn = "fabrika" | "depo";

export type SupplierCsvParseResult = {
  rows: PriceImportRow[];
  errors: string[];
  skipped: number;
  families: number;
};

const COL_EBAT = 3;
const COL_NAME = 4;
const COL_RENK = 5;
const COL_FABRIKA = 9;
const COL_DEPO = 10;

function parsePriceValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  const cleaned = String(value ?? "")
    .replace(/[₺\s]/g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickPrice(row: unknown[], column: SupplierPriceColumn): number | null {
  const idx = column === "depo" ? COL_DEPO : COL_FABRIKA;
  return parsePriceValue(row[idx]);
}

/** 60X60 YK SERAMIK → 60x60, 19,7X19,7 → 19.7x19.7 */
export function parseSupplierSize(raw: string): string | null {
  const cleaned = raw.trim().replace(/,/g, ".");
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return normalizeSize(`${match[1]}x${match[2]}`);
}

export function splitSupplierProductNames(raw: string): string[] {
  return raw
    .replace(/\s+/g, " ")
    .split("-")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function normalizeFamilyName(name: string) {
  return name.replace(/\s+/g, " ").trim().toUpperCase();
}

/** BIEN / QUA RENK sütununu katalog yüzey koduna çevirir */
export function parseSupplierRenkToSurface(renk: string): Surface {
  const direct = parseSurface(renk);
  if (direct && ["MAT", "SLP", "FLP"].includes(direct)) {
    return direct;
  }

  const v = renk.toUpperCase();

  if (/FULL.*(LAP|PARLAK)|PARLAK\s*3D|SIRDAN\s*PARLAK|SIDAN\s*PARLAK/i.test(v)) {
    return "FLP";
  }
  if (/SEMI.*LAP|SEMİ.*LAP|SEMİ\s*3D/i.test(v)) {
    return "SLP";
  }
  if (/MAT.*PARLAK/i.test(v)) {
    return "MAT";
  }
  if (/ANTISL|ANTİAS/i.test(v)) {
    return "MAT";
  }

  return "MAT";
}

function isHeaderRow(row: unknown[]) {
  const ebat = String(row[COL_EBAT] ?? "").trim().toUpperCase();
  const name = String(row[COL_NAME] ?? "").trim().toUpperCase();
  return ebat === "EBAT" && name.includes("ÜRÜN");
}

function isFooterRow(row: unknown[]) {
  const joined = row.map((c) => String(c ?? "")).join(" ").toUpperCase();
  return (
    joined.includes("*FİYATLAR") ||
    joined.includes("PALET ÜCRETİ") ||
    joined.includes("TOPTAN FİYAT LİSTESİ") ||
    joined.includes("BIEN SERAMİK")
  );
}

type PriceGroup = {
  size: string;
  renk: string;
  surface: Surface;
  price: number;
};

function emitRows(
  brandSlug: SupplierBrandSlug,
  group: PriceGroup,
  names: string[],
  rows: PriceImportRow[]
) {
  for (const rawName of names) {
    const family = normalizeFamilyName(rawName);
    if (!family) continue;

    rows.push({
      marka_slug: brandSlug,
      aile: family,
      olcu: group.size,
      yuzey: group.surface,
      kalite: "1",
      fiyat: group.price,
      kod: `${family} ${group.size.toUpperCase()} ${group.renk}`.trim(),
    });
  }
}

/**
 * BIEN / QUA tedarikçi CSV — çok satırlı başlık, tire ile ayrılmış ürün grupları.
 * Ham satır dizisi (sheet_to_json header:1) bekler.
 */
export function parseSupplierPriceCsvRows(
  matrix: unknown[][],
  brandSlug: SupplierBrandSlug,
  priceColumn: SupplierPriceColumn = "fabrika"
): SupplierCsvParseResult {
  const rows: PriceImportRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  let currentSize: string | null = null;
  let currentGroup: PriceGroup | null = null;

  for (const [index, row] of matrix.entries()) {
    const rowNum = index + 1;
    if (!Array.isArray(row) || row.length === 0) {
      skipped++;
      continue;
    }
    if (isHeaderRow(row) || isFooterRow(row)) {
      skipped++;
      continue;
    }

    const sizeRaw = String(row[COL_EBAT] ?? "").trim();
    const namesRaw = String(row[COL_NAME] ?? "").trim();
    const renkRaw = String(row[COL_RENK] ?? "").trim();
    const price = pickPrice(row, priceColumn);

    if (sizeRaw) {
      const parsedSize = parseSupplierSize(sizeRaw);
      if (parsedSize) {
        currentSize = parsedSize;
      } else if (sizeRaw.length > 0) {
        errors.push(`Satır ${rowNum}: ölçü okunamadı — ${sizeRaw}`);
      }
    }

    if (!namesRaw) {
      skipped++;
      continue;
    }

    const names = splitSupplierProductNames(namesRaw);
    if (names.length === 0) {
      skipped++;
      continue;
    }

    if (renkRaw && price != null && currentSize) {
      currentGroup = {
        size: currentSize,
        renk: renkRaw,
        surface: parseSupplierRenkToSurface(renkRaw),
        price,
      };
      emitRows(brandSlug, currentGroup, names, rows);
      continue;
    }

    if (currentGroup && !renkRaw && currentSize) {
      emitRows(brandSlug, currentGroup, names, rows);
      continue;
    }

    if (!currentSize) {
      errors.push(`Satır ${rowNum}: ölçü yok — ${namesRaw.slice(0, 40)}`);
      continue;
    }

    if (!price) {
      errors.push(
        `Satır ${rowNum}: fiyat yok — ${namesRaw.slice(0, 40)} (${renkRaw || "renk yok"})`
      );
    }
  }

  const families = new Set(rows.map((r) => r.aile)).size;

  return { rows, errors, skipped, families };
}
