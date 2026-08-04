import path from "node:path";
import { NextResponse } from "next/server";
import { resolveFilterToolAccess } from "@/lib/filter-tool-access";
import {
  parseFilterCriteriaFromSearchParams,
  runProductFilter,
} from "@/lib/campaign-filter-query";
import { qualityLabel } from "@/lib/utils";
import { surfaceDisplayLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// bkz. src/app/api/admin/campaigns/filter/export-pdf/route.ts — aynı lazy-import
// deseni burada da korunuyor (build-zamanı "Collecting page data" hatasını önler).
const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

let pdfmakeReady = false;

async function loadPdfmake() {
  const pdfmake = await import("pdfmake");
  if (!pdfmakeReady) {
    pdfmake.setFonts({
      Roboto: {
        normal: path.join(FONT_DIR, "Roboto-Regular.ttf"),
        bold: path.join(FONT_DIR, "Roboto-Medium.ttf"),
        italics: path.join(FONT_DIR, "Roboto-Italic.ttf"),
        bolditalics: path.join(FONT_DIR, "Roboto-MediumItalic.ttf"),
      },
    });
    pdfmake.setLocalAccessPolicy((p) => p.startsWith(FONT_DIR));
    pdfmakeReady = true;
  }
  return pdfmake;
}

/** Ürün segmenti filtre sonucunu PDF olarak indirir — plasiyer/onaylı bayi. */
export async function GET(request: Request) {
  const access = await resolveFilterToolAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const criteria = parseFilterCriteriaFromSearchParams(searchParams);
  if ("error" in criteria) {
    return NextResponse.json({ error: criteria.error }, { status: 400 });
  }

  const rows = await runProductFilter(criteria, { adminBrandId: null });

  const tableBody = [
    [
      { text: "Marka", style: "th" },
      { text: "Ürün Ailesi", style: "th" },
      { text: "Ölçü", style: "th" },
      { text: "Yüzey", style: "th" },
      { text: "Kalite", style: "th" },
      { text: "Varyant (m²)", style: "th", alignment: "right" as const },
      { text: "Aile Toplam (m²)", style: "th", alignment: "right" as const },
    ],
    ...rows.map((row) => [
      { text: row.brandName },
      { text: row.familyName },
      { text: row.size.toUpperCase() },
      { text: surfaceDisplayLabel(row.surface) },
      { text: qualityLabel(row.quality) },
      { text: row.stockM2.toLocaleString("tr-TR"), alignment: "right" as const },
      { text: row.familyTotalStockM2.toLocaleString("tr-TR"), alignment: "right" as const },
    ]),
  ];

  const basisLabel =
    criteria.basis === "family" ? "aile toplamı" : "varyant bazında";
  const rangeLabel =
    criteria.minM2 != null && criteria.maxM2 != null
      ? `${criteria.minM2.toLocaleString("tr-TR")} – ${criteria.maxM2.toLocaleString("tr-TR")} m² arası`
      : criteria.minM2 != null
        ? `${criteria.minM2.toLocaleString("tr-TR")} m² ve üstü`
        : criteria.maxM2 != null
          ? `${criteria.maxM2.toLocaleString("tr-TR")} m² altı`
          : "tüm stoklar";
  const subtitleParts = [`Stok: ${rangeLabel} (${basisLabel})`];
  if (criteria.materialType) subtitleParts.push(`Malzeme: ${criteria.materialType}`);
  if (criteria.quality) subtitleParts.push(`Kalite: ${qualityLabel(criteria.quality)}`);
  if (criteria.sizes.length > 0) {
    subtitleParts.push(`Ebat: ${criteria.sizes.map((s) => s.toUpperCase()).join(", ")}`);
  }
  if (criteria.surfaces.length > 0) {
    subtitleParts.push(
      `Yüzey: ${criteria.surfaces.map((s) => surfaceDisplayLabel(s)).join(", ")}`
    );
  }

  const { createPdf } = await loadPdfmake();
  const pdf = createPdf({
    pageOrientation: "landscape",
    pageMargins: [30, 30, 30, 30],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 9, color: "#555555" },
      th: { bold: true, fillColor: "#eeeeee" },
      footer: { fontSize: 8, color: "#888888" },
    },
    content: [
      { text: "Ürün Segmenti", style: "h1" },
      { text: subtitleParts.join(" · "), style: "subtitle", margin: [0, 0, 0, 12] },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", "auto", "auto", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
      {
        text: `${rows.length} ürün · ${new Date().toLocaleDateString("tr-TR")}`,
        style: "footer",
        margin: [0, 12, 0, 0],
      },
    ],
  });

  const buffer = await pdf.getBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="urun-segmenti-${stamp}.pdf"`,
    },
  });
}
