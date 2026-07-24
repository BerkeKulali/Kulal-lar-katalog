/**
 * Tıklanma raporu için istemci + sunucu ortak (saf) tipleri ve yardımcıları.
 * Buraya prisma/DB importu KOYMAYIN — istemci bileşenleri de bunu import eder.
 */

export type ReportDimension = "product" | "date" | "actor";

export const REPORT_DIMENSIONS: ReportDimension[] = ["product", "date", "actor"];

export const DIMENSION_LABELS: Record<ReportDimension, string> = {
  product: "Ürün",
  date: "Tarih",
  actor: "Bayi / Plasiyer",
};

export type ReportFilters = {
  from: Date;
  to: Date;
  familyId?: string | null;
  actorType?: "dealer" | "salesperson" | null;
  salespersonId?: string | null;
  actorQuery?: string | null;
  dimensions: ReportDimension[];
  adminBrandId: string | null;
};

export type ReportRow = {
  product: string | null;
  date: string | null;
  actor: string | null;
  actorType: string | null;
  count: number;
};

export type ReportResult = {
  dimensions: ReportDimension[];
  rows: ReportRow[];
  total: number;
  truncated: boolean;
};

export function actorTypeLabel(actorType: string | null): string {
  if (actorType === "dealer") return "Bayi";
  if (actorType === "salesperson") return "Plasiyer";
  return "—";
}

export function parseDimensions(raw: string | null | undefined): ReportDimension[] {
  const parts = (raw ?? "").split(",").map((s) => s.trim());
  const dims = REPORT_DIMENSIONS.filter((d) => parts.includes(d));
  return dims.length > 0 ? dims : ["product"];
}

// --- Saf toplama (aggregation) — DB'den bağımsız, test edilebilir ---

export type ClickEventForReport = {
  familyName: string;
  brandName: string;
  actorType: string;
  actorName: string | null;
  count: number;
  createdAt: Date;
};

const ISTANBUL_TZ = "Europe/Istanbul";

/** Istanbul saatine göre YYYY-MM-DD (gruplama anahtarı). */
export function istanbulDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: ISTANBUL_TZ });
}

/** YYYY-MM-DD → dd.mm.yyyy (görüntü). */
export function displayDay(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

export function actorDisplayName(
  actorType: string,
  actorName: string | null
): string {
  if (actorName) return actorName;
  if (actorType === "dealer") return "Bilinmeyen bayi";
  if (actorType === "salesperson") return "Bilinmeyen plasiyer";
  return "Bilinmeyen";
}

/**
 * Tıklama olaylarını seçilen kırılımlara göre gruplar. Saftır: aynı girdi hep
 * aynı çıktıyı verir; DB'ye dokunmaz. Satırlar sayıya göre azalan sıralanır.
 */
export function aggregateClickEvents(
  events: ClickEventForReport[],
  dimensions: ReportDimension[]
): { rows: ReportRow[]; total: number } {
  const groups = new Map<string, ReportRow>();
  let total = 0;

  for (const ev of events) {
    total += ev.count;

    const product = dimensions.includes("product")
      ? `${ev.familyName} · ${ev.brandName}`
      : null;
    const date = dimensions.includes("date")
      ? displayDay(istanbulDayKey(ev.createdAt))
      : null;
    const actor = dimensions.includes("actor")
      ? actorDisplayName(ev.actorType, ev.actorName)
      : null;
    const actorType = dimensions.includes("actor") ? ev.actorType : null;

    const key = [product ?? "", date ?? "", actor ?? "", actorType ?? ""].join(
      "|"
    );
    const existing = groups.get(key);
    if (existing) {
      existing.count += ev.count;
    } else {
      groups.set(key, { product, date, actor, actorType, count: ev.count });
    }
  }

  const rows = [...groups.values()].sort((a, b) => b.count - a.count);
  return { rows, total };
}
