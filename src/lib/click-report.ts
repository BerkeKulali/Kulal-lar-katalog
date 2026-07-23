import { prisma } from "@/lib/prisma";

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

const MAX_EVENTS = 50_000;
const ISTANBUL = "Europe/Istanbul";

/** Istanbul saatine göre YYYY-MM-DD (gruplama anahtarı). */
function istanbulDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: ISTANBUL });
}

/** YYYY-MM-DD → dd.mm.yyyy (görüntü). */
function displayDay(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

function actorLabel(actorType: string, actorName: string | null): string {
  if (actorName) return actorName;
  if (actorType === "dealer") return "Bilinmeyen bayi";
  if (actorType === "salesperson") return "Bilinmeyen plasiyer";
  return "Bilinmeyen";
}

export function actorTypeLabel(actorType: string | null): string {
  if (actorType === "dealer") return "Bayi";
  if (actorType === "salesperson") return "Plasiyer";
  return "—";
}

/** URL parametrelerinden rapor filtrelerini üretir (varsayılan: son 30 gün). */
export function parseReportFilters(
  searchParams: URLSearchParams,
  adminBrandId: string | null
): ReportFilters {
  const toStr = searchParams.get("to");
  const fromStr = searchParams.get("from");

  let to = toStr ? new Date(`${toStr}T23:59:59+03:00`) : new Date();
  if (Number.isNaN(to.getTime())) to = new Date();

  let from: Date;
  if (fromStr) {
    from = new Date(`${fromStr}T00:00:00+03:00`);
    if (Number.isNaN(from.getTime())) {
      from = new Date(to);
      from.setDate(from.getDate() - 30);
    }
  } else {
    from = new Date(to);
    from.setDate(from.getDate() - 30);
  }

  const actorTypeRaw = searchParams.get("actorType");
  const actorType =
    actorTypeRaw === "dealer" || actorTypeRaw === "salesperson"
      ? actorTypeRaw
      : null;

  return {
    from,
    to,
    familyId: searchParams.get("familyId")?.trim() || null,
    actorType,
    salespersonId: searchParams.get("salespersonId")?.trim() || null,
    actorQuery: searchParams.get("q")?.trim() || null,
    dimensions: parseDimensions(searchParams.get("dims")),
    adminBrandId,
  };
}

export function parseDimensions(raw: string | null | undefined): ReportDimension[] {
  const parts = (raw ?? "").split(",").map((s) => s.trim());
  const dims = REPORT_DIMENSIONS.filter((d) => parts.includes(d));
  return dims.length > 0 ? dims : ["product"];
}

export async function buildClickReport(
  filters: ReportFilters
): Promise<ReportResult> {
  const events = await prisma.familyClickEvent.findMany({
    where: {
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.familyId ? { familyId: filters.familyId } : {}),
      ...(filters.actorType ? { actorType: filters.actorType } : {}),
      ...(filters.salespersonId ? { salespersonId: filters.salespersonId } : {}),
      ...(filters.actorQuery
        ? { actorName: { contains: filters.actorQuery } }
        : {}),
      ...(filters.adminBrandId
        ? { family: { brandId: filters.adminBrandId } }
        : {}),
    },
    select: {
      familyId: true,
      actorType: true,
      actorName: true,
      count: true,
      createdAt: true,
      family: {
        select: { name: true, brand: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_EVENTS + 1,
  });

  const truncated = events.length > MAX_EVENTS;
  const rowsData = truncated ? events.slice(0, MAX_EVENTS) : events;

  const dims = filters.dimensions;
  const groups = new Map<
    string,
    { product: string | null; date: string | null; actor: string | null; actorType: string | null; count: number }
  >();

  let total = 0;
  for (const ev of rowsData) {
    total += ev.count;

    const product = dims.includes("product")
      ? `${ev.family.name} · ${ev.family.brand.name}`
      : null;
    const date = dims.includes("date")
      ? displayDay(istanbulDayKey(ev.createdAt))
      : null;
    const actor = dims.includes("actor")
      ? actorLabel(ev.actorType, ev.actorName)
      : null;
    const actorType = dims.includes("actor") ? ev.actorType : null;

    const key = [product ?? "", date ?? "", actor ?? "", actorType ?? ""].join(
      ""
    );
    const existing = groups.get(key);
    if (existing) {
      existing.count += ev.count;
    } else {
      groups.set(key, { product, date, actor, actorType, count: ev.count });
    }
  }

  const rows = [...groups.values()].sort((a, b) => b.count - a.count);

  return { dimensions: dims, rows, total, truncated };
}
