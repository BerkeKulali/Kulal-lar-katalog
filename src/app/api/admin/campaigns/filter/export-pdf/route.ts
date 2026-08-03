import path from "node:path";
import { NextResponse } from "next/server";
import { createPdf, setFonts, setLocalAccessPolicy } from "pdfmake";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  parseFilterCriteriaFromSearchParams,
  runProductFilter,
} from "@/lib/campaign-filter-query";
import { qualityLabel } from "@/lib/utils";
import { surfaceDisplayLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Projeye gömülü Roboto (pdfmake'in kendi paketinden kopyalanmış — Türkçe
// karakterleri [ığşĞİŞ...] destekler). node_modules içindeki font yoluna
// bağımlı kalmamak için repo'nun kendi içinde tutulur (bkz. Next.js
// serverless dosya izleme notu: node_modules'a dinamik fs erişimi Vercel
// build'inde elenebiliyor, proje-içi statik yol daha güvenilir).
const FONT_DIR = path.join(process.cwd(), "src/lib/pdf/fonts");

setFonts({
  Roboto: {
    normal: path.join(FONT_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONT_DIR, "Roboto-Medium.ttf"),
    italics: path.join(FONT_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONT_DIR, "Roboto-MediumItalic.ttf"),
  },
});
// Yalnızca yukarıdaki sabit, projeye gömülü font dosyalarına erişime izin ver.
setLocalAccessPolicy((p) => p.startsWith(FONT_DIR));

/** Ürün segmenti filtre sonucunu PDF olarak indirir. Yetki: campaigns. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const criteria = parseFilterCriteriaFromSearchParams(searchParams);
  if ("error" in criteria) {
    return NextResponse.json({ error: criteria.error }, { status: 400 });
  }

  const rows = await runProductFilter(criteria, {
    adminBrandId: auth.admin.brandId,
  });

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

  const directionLabel = criteria.direction === "under" ? "altı" : "üstü";
  const basisLabel =
    criteria.basis === "family" ? "aile toplamı" : "varyant bazında";
  const subtitleParts = [
    `Eşik: ${criteria.thresholdM2.toLocaleString("tr-TR")} m² ${directionLabel} (${basisLabel})`,
  ];
  if (criteria.materialType) subtitleParts.push(`Malzeme: ${criteria.materialType}`);
  if (criteria.quality) subtitleParts.push(`Kalite: ${qualityLabel(criteria.quality)}`);

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
