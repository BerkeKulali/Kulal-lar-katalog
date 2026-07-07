import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  parseSupplierPriceCsvRows,
  type SupplierBrandSlug,
  type SupplierPriceColumn,
} from "@/lib/bien-qua-import";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const ALLOWED: SupplierBrandSlug[] = ["bien", "qua"];

function parseBrandSlug(value: string | null): SupplierBrandSlug | null {
  const slug = (value ?? "").trim().toLowerCase();
  return ALLOWED.includes(slug as SupplierBrandSlug)
    ? (slug as SupplierBrandSlug)
    : null;
}

function parsePriceColumn(value: string | null): SupplierPriceColumn {
  return (value ?? "").trim().toLowerCase() === "depo" ? "depo" : "fabrika";
}

async function assertBrandAccess(
  admin: { brandId: string | null },
  brandSlug: SupplierBrandSlug
) {
  if (!admin.brandId) return null;

  const brand = await prisma.brand.findUnique({ where: { id: admin.brandId } });
  if (brand?.slug !== brandSlug) {
    return NextResponse.json(
      { error: `Bu işlem yalnızca ${brandSlug.toUpperCase()} markası için kullanılabilir` },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const formData = await request.formData();
  const brandSlug = parseBrandSlug(formData.get("brandSlug") as string | null);
  if (!brandSlug) {
    return NextResponse.json({ error: "Geçersiz marka" }, { status: 400 });
  }

  const denied = await assertBrandAccess(admin, brandSlug);
  if (denied) return denied;

  const file = formData.get("file");
  const priceColumn = parsePriceColumn(formData.get("priceColumn") as string | null);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const { rows, errors: parseErrors, skipped, families } =
    parseSupplierPriceCsvRows(matrix, brandSlug, priceColumn);

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error: "İçe aktarılacak satır bulunamadı",
        parseErrors,
        skipped,
        total: 0,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    rows,
    parseErrors,
    skipped,
    total: rows.length,
    families,
    priceColumn,
    brandSlug,
  });
}
