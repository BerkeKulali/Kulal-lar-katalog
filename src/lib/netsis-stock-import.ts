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

/** TR/EN Excel sayıları: 2.656,80 · 2656.80 · 2,656.80 */
export function parseStockQuantity(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;

  let normalized = s;
  if (normalized.includes(",") && normalized.includes(".")) {
    if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
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

export function aggregateStockRows(rows: NetsisStockRow[]) {
  const byCode = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (!byCode.has(row.code)) byCode.set(row.code, new Map());
    const labels = byCode.get(row.code)!;
    labels.set(row.label, (labels.get(row.label) ?? 0) + row.quantityM2);
  }

  return byCode;
}
