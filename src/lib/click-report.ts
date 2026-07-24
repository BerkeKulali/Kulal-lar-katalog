import { prisma } from "@/lib/prisma";
import {
  aggregateClickEvents,
  parseDimensions,
  type ReportFilters,
  type ReportResult,
} from "@/lib/click-report-shared";

// Saf tip/etiket/yardımcılar istemcinin de kullanabilmesi için ayrı dosyada.
export * from "@/lib/click-report-shared";

const MAX_EVENTS = 50_000;

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

  const { rows, total } = aggregateClickEvents(
    rowsData.map((ev) => ({
      familyName: ev.family.name,
      brandName: ev.family.brand.name,
      actorType: ev.actorType,
      actorName: ev.actorName,
      count: ev.count,
      createdAt: ev.createdAt,
    })),
    filters.dimensions
  );

  return { dimensions: filters.dimensions, rows, total, truncated };
}
