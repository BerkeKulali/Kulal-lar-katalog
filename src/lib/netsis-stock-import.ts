/** Netsis / Excel stok satırı ayrıştırma */

const CODE_KEYS = [
  "ürün kodu",
  "urun kodu",
  "urun_kodu",
  "urunkodu",
  "kod",
  "product_code",
  "code",
];

const LABEL_KEYS = ["özellik", "ozellik", "label", "lot", "kalite"];

const QTY_KEYS = [
  "sipariş alınabilir",
  "siparis alinabilir",
  "siparis_alinabilir",
  "seramik depo",
  "seramik_depo",
  "genel toplam (1. kalite)",
  "genel toplam",
  "genel_toplam",
  "miktar",
  "stok",
  "quantity",
];

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function pickColumn(row: Record<string, unknown>, keys: string[]): unknown {
  const map = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    map.set(normalizeKey(k), v);
  }
  for (const key of keys) {
    if (map.has(key)) return map.get(key);
  }
  return undefined;
}

/**
 * Netsis/Excel sayısı → number. Netsis TÜRKÇE biçim kullanır:
 *   nokta = binlik ayıracı, virgül = ondalık.
 *   "1.241" = 1241 · "2.656,80" = 2656.8 · "1,5" = 1.5 · "56" = 56
 *
 * Nokta-only durumu belirsiz (binlik mi ondalık mı). Türkçe binlik grupları
 * tam 3 hanedir; noktadan sonraki her grup 3 haneyse binlik kabul edilir
 * (nokta silinir), aksi halde ondalık kabul edilir.
 */
export function parseStockQuantity(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw >= 0 ? raw : null;
  const s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;

  let normalized = s;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Türkçe: nokta binlik, virgül ondalık.
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Virgül ondalık.
    normalized = s.replace(",", ".");
  } else if (hasDot) {
    // Nokta-only: binlik mi ondalık mı?
    const parts = s.split(".");
    const groupsAfterFirst = parts.slice(1);
    const looksLikeThousands =
      groupsAfterFirst.length > 0 &&
      groupsAfterFirst.every((p) => /^\d{3}$/.test(p));
    normalized = looksLikeThousands ? parts.join("") : s;
  }

  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type NetsisStockRow = {
  code: string;
  label: string;
  quantityM2: number;
  rowNum: number;
};

export function parseNetsisStockRows(
  rows: Record<string, unknown>[]
): { parsed: NetsisStockRow[]; errors: string[] } {
  const parsed: NetsisStockRow[] = [];
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2;
    const codeRaw = pickColumn(row, CODE_KEYS);
    const code = codeRaw != null ? String(codeRaw).trim().toUpperCase() : "";
    if (!code) {
      errors.push(`Satır ${rowNum}: Ürün kodu boş`);
      continue;
    }

    const labelRaw = pickColumn(row, LABEL_KEYS);
    const label =
      labelRaw != null && String(labelRaw).trim()
        ? String(labelRaw).trim()
        : "GENEL";

    const qtyRaw = pickColumn(row, QTY_KEYS);
    const quantityM2 = parseStockQuantity(qtyRaw);
    if (quantityM2 == null || quantityM2 <= 0) {
      continue;
    }

    parsed.push({ code, label, quantityM2, rowNum });
  }

  return { parsed, errors };
}

/**
 * Kullanıcının tek kutuya girdiği çoklu Netsis kodunu ayrıştırır.
 * Virgül, boşluk, noktalı virgül veya satır sonuyla ayrılabilir.
 * Büyük harfe çevirir, tekrarları temizler, sırayı korur.
 */
export function parseNetsisCodesInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const code = part.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

// --- Netsis "Stok Kodu + Bakiye" ile eşleşen import (VariantNetsisCode) ---

const STOCK_CODE_KEYS = [
  "stok kodu",
  "stok_kodu",
  "stokkodu",
  "netsis kodu",
  "netsis_kodu",
  ...CODE_KEYS,
];

const BALANCE_KEYS = [
  "bakiye",
  "balance",
  "sipariş alınabilir",
  "siparis alinabilir",
  "genel toplam (1. kalite)",
  "genel toplam",
  "genel_toplam",
  "miktar",
  "stok",
  "quantity",
];

export type NetsisBalanceRow = {
  code: string;
  quantityM2: number;
  rowNum: number;
};

export type ParsedNetsisBalances = {
  /** code → toplam bakiye (0 dahil). Kod büyük harfe normalize edilir. */
  balances: Map<string, number>;
  errors: string[];
};

/**
 * "Stok Kodu" ve "Bakiye" sütunlu Netsis dökümünü ayrıştırır.
 * - Bakiye 0 olan satırlar KORUNUR (stok sıfıra çekilebilsin diye).
 * - Aynı kod birden çok kez geçerse bakiyeler toplanır.
 * - Boş/kodsuz satırlar hata olarak raporlanır.
 */
export function parseNetsisBalanceRows(
  rows: Record<string, unknown>[]
): ParsedNetsisBalances {
  const balances = new Map<string, number>();
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2;
    const codeRaw = pickColumn(row, STOCK_CODE_KEYS);
    const code = codeRaw != null ? String(codeRaw).trim().toUpperCase() : "";
    if (!code) {
      // Tamamen boş satırları sessizce atla; yalnızca bakiyesi olup kodu
      // olmayan satırları hata say.
      const balanceRaw = pickColumn(row, BALANCE_KEYS);
      if (balanceRaw != null && String(balanceRaw).trim() !== "") {
        errors.push(`Satır ${rowNum}: Stok kodu boş`);
      }
      continue;
    }

    const balanceRaw = pickColumn(row, BALANCE_KEYS);
    // Boş bakiye 0 kabul edilir (Netsis bazen boş bırakır).
    const quantity =
      balanceRaw == null || String(balanceRaw).trim() === ""
        ? 0
        : parseStockQuantity(balanceRaw);
    if (quantity == null) {
      errors.push(`Satır ${rowNum}: Geçersiz bakiye (${String(balanceRaw)})`);
      continue;
    }

    balances.set(code, (balances.get(code) ?? 0) + quantity);
  }

  return { balances, errors };
}

export function aggregateStockRows(rows: NetsisStockRow[]) {
  const byCode = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!byCode.has(row.code)) byCode.set(row.code, new Map());
    const labels = byCode.get(row.code)!;
    labels.set(row.label, (labels.get(row.label) ?? 0) + row.quantityM2);
  }

  return byCode;
}
