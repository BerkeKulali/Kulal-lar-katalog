import { normalizeSize } from "@/lib/constants";
import type { Surface } from "@/generated/prisma/client";
import type { PriceImportRow } from "@/lib/price-import";

export type GuralPriceColumn = "liste" | "fabrika" | "depo";

export type GuralCsvParseResult = {
  rows: PriceImportRow[];
  errors: string[];
  skipped: number;
};

export type GuralParsedProduct = {
  family: string;
  size: string;
  surface: Surface;
  color: string;
  rawName: string;
};

type SurfacePattern = {
  pattern: RegExp;
  surface: Surface;
};

/** GÜRAL ürün adından yüzey kodu (uzun / özel eşleşmeler önce) */
const GURAL_SURFACE_PATTERNS: SurfacePattern[] = [
  { pattern: /\bSOFT\s+ANTISLIP\b/i, surface: "SOFT_ANTISLIP" },
  { pattern: /\bANTISLIP\b.*\bR11\b/i, surface: "R11" },
  { pattern: /\bANTISLIP\b.*\bR10\b/i, surface: "R10" },
  { pattern: /\bANTISLIP\b/i, surface: "ANTISLIP" },
  { pattern: /\bFULL\s+LAPPATO\b/i, surface: "FLP" },
  { pattern: /\bSEMI\s+LAPPATO\b/i, surface: "SLP" },
  { pattern: /\bSUGAR\b/i, surface: "SGR" },
  { pattern: /\bPARLAK\b/i, surface: "GLS" },
  { pattern: /\bMAT\b/i, surface: "MAT" },
];

function stripSizeFromName(name: string, size: string) {
  const normalized = name.toUpperCase();
  const sizeToken = size.toUpperCase().replace(/\s+/g, "");
  return normalized
    .replace(new RegExp(`\\b${sizeToken.replace(/x/gi, "[xX]")}\\b`), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFamilyAndColor(name: string, size: string, surface: Surface) {
  const withoutSize = stripSizeFromName(name, size);
  const family = withoutSize.split(/\s+/)[0] ?? "";
  let rest = withoutSize.slice(family.length).trim();

  for (const { pattern, surface: code } of GURAL_SURFACE_PATTERNS) {
    if (code !== surface) continue;
    rest = rest.replace(pattern, " ").replace(/\s+/g, " ").trim();
    break;
  }

  return {
    family: family.trim(),
    color: rest.trim(),
  };
}

export function parseGuralSurfaceFromName(name: string): Surface | null {
  const upper = name.toUpperCase();
  for (const { pattern, surface } of GURAL_SURFACE_PATTERNS) {
    if (pattern.test(upper)) return surface;
  }
  return null;
}

export function parseGuralProductName(
  rawName: string,
  rawSize: string
): GuralParsedProduct | null {
  const name = rawName.trim();
  const size = normalizeSize(rawSize);
  if (!name || !size) return null;

  const surface = parseGuralSurfaceFromName(name);
  if (!surface) return null;

  const { family, color } = extractFamilyAndColor(name, size, surface);
  if (!family) return null;

  const familyLabel = color ? `${family} ${color}` : family;

  return {
    family: familyLabel,
    size,
    surface,
    color,
    rawName: name,
  };
}

export function guralFamilyCode(parsed: GuralParsedProduct) {
  return parsed.rawName
    .replace(new RegExp(`\\b${parsed.size.replace(/x/g, "[xX]")}\\b`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function productNameColumn(row: Record<string, unknown>) {
  return (
    row["ÜRÜN ADI"] ??
    row["URUN ADI"] ??
    Object.entries(row).find(([key]) => /r.n\s*adi/i.test(key))?.[1]
  );
}

function priceColumnValue(
  row: Record<string, unknown>,
  kind: GuralPriceColumn
): unknown {
  const entries = Object.entries(row);
  const match = (patterns: RegExp[]) =>
    entries.find(([key]) => patterns.some((p) => p.test(key)))?.[1];

  if (kind === "fabrika") {
    return match([/fabr.*sevk/i, /fabrika/i]);
  }
  if (kind === "depo") {
    return match([/depo.*tesl/i, /depo/i]);
  }
  return match([/l.*ste.*f.*yat/i, /liste/i, /fiyat/i]);
}

export function isGuralPriceCsvRow(row: Record<string, unknown>) {
  const name = productNameColumn(row);
  const size = row.EBAT ?? row.ebat;
  return Boolean(name && size);
}

export function parseGuralPriceCsvRows(
  rawRows: Record<string, unknown>[],
  priceColumn: GuralPriceColumn = "liste"
): GuralCsvParseResult {
  const rows: PriceImportRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const [index, row] of rawRows.entries()) {
    const rowNum = index + 2;
    const rawName = String(productNameColumn(row) ?? "").trim();
    const rawSize = String(row.EBAT ?? row.ebat ?? "").trim();
    const price = Number(priceColumnValue(row, priceColumn));

    if (!rawName) {
      skipped++;
      continue;
    }

    const parsed = parseGuralProductName(rawName, rawSize);
    if (!parsed) {
      errors.push(`Satır ${rowNum}: yüzey ayrıştırılamadı — ${rawName}`);
      continue;
    }
    if (!Number.isFinite(price)) {
      errors.push(`Satır ${rowNum}: geçersiz fiyat — ${rawName}`);
      continue;
    }

    rows.push({
      marka_slug: "gural",
      aile: parsed.family,
      olcu: parsed.size,
      yuzey: parsed.surface,
      kalite: "1",
      fiyat: price,
      kod: parsed.rawName,
    });
  }

  return { rows, errors, skipped };
}
