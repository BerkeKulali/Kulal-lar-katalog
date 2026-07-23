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
