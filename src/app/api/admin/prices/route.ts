import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/admin-auth";
import { normalizeSize } from "@/lib/constants";
import {
  syncEndPriceForFirstVariant,
  syncEndPricesForFirstVariants,
} from "@/lib/end-price-sync";
import { importPriceRows } from "@/lib/price-import";
import { parseQuality, parseSurface } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdminPermission("prices");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const variants = await prisma.productVariant.findMany({
    where: admin.brandId
      ? { family: { brandId: admin.brandId } }
      : undefined,
    include: {
      family: { include: { brand: true } },
    },
    orderBy: [
      { family: { brand: { sortOrder: "asc" } } },
      { family: { name: "asc" } },
      { size: "asc" },
    ],
  });

  const rows = variants.map((v) => ({
    marka: v.family.brand.name,
    marka_slug: v.family.brand.slug,
    aile: v.family.name,
    olcu: v.size,
    yuzey: v.surface,
    kalite: v.quality === "FIRST" ? "1" : "END",
    fiyat: v.price,
    kod: v.code ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Fiyatlar");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="fiyat-listesi.xlsx"',
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = (formData.get("mode") as string) ?? "upsert";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const results = await importPriceRows(
    rows.map((row) => ({
      marka_slug: row.marka_slug as string | undefined,
      marka: row.marka as string | undefined,
      aile: String(row.aile ?? ""),
      olcu: String(row.olcu ?? ""),
      yuzey: String(row.yuzey ?? ""),
      kalite: String(row.kalite ?? ""),
      fiyat: Number(row.fiyat),
      kod: row.kod ? String(row.kod) : null,
    })),
    mode,
    admin
  );

  return NextResponse.json(results);
}

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission("prices");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = (await request.json().catch(() => null)) as
    | {
        mode?: "single" | "bulk";
        variantId?: string;
        price?: number | null;
        filters?: {
          brandSlug?: string | null;
          size?: string | null;
          surface?: string | null;
          quality?: string | null;
          familyName?: string | null;
        };
      }
    | null;
  const mode = body?.mode ?? "single";

  if (mode === "bulk") {
    const priceRaw = body?.price;
    if (typeof priceRaw !== "number" || !Number.isFinite(priceRaw) || priceRaw < 0) {
      return NextResponse.json({ error: "Gecersiz fiyat" }, { status: 400 });
    }

    const filters = body?.filters ?? {};
    const size = filters.size ? normalizeSize(String(filters.size)) : null;
    const surface = filters.surface
      ? parseSurface(String(filters.surface))
      : null;
    const quality = filters.quality
      ? parseQuality(String(filters.quality))
      : null;
    const familyName = filters.familyName?.trim() || null;
    const brandSlug = filters.brandSlug?.trim().toLowerCase() || null;

    let brandIdFilter: string | undefined = admin.brandId ?? undefined;
    if (brandSlug) {
      const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } });
      if (!brand) {
        return NextResponse.json({ error: "Marka bulunamadi" }, { status: 404 });
      }
      if (admin.brandId && admin.brandId !== brand.id) {
        return NextResponse.json(
          { error: "Bu markaya yetkiniz yok" },
          { status: 403 }
        );
      }
      brandIdFilter = brand.id;
    }

    const targetRows = await prisma.productVariant.findMany({
      where: {
        ...(size ? { size } : {}),
        ...(surface ? { surface } : {}),
        ...(quality ? { quality } : {}),
        family: {
          ...(brandIdFilter ? { brandId: brandIdFilter } : {}),
          ...(familyName ? { name: { contains: familyName } } : {}),
        },
      },
      select: {
        id: true,
        familyId: true,
        size: true,
        surface: true,
        quality: true,
      },
    });

    if (targetRows.length === 0) {
      return NextResponse.json({ error: "Eslesen satir bulunamadi" }, { status: 404 });
    }

    const nextPrice = Math.round(priceRaw);
    const result = await prisma.productVariant.updateMany({
      where: { id: { in: targetRows.map((r) => r.id) } },
      data: { price: nextPrice },
    });

    let syncedEndCount = 0;
    if (quality === "FIRST") {
      const synced = await syncEndPricesForFirstVariants(
        targetRows.map((row) => ({
          familyId: row.familyId,
          size: row.size,
          surface: row.surface,
          price: nextPrice,
        }))
      );
      syncedEndCount = synced.length;
    }

    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { lastPriceListUpdate: new Date() },
      create: { id: "default", lastPriceListUpdate: new Date() },
    });

    return NextResponse.json({
      ok: true,
      updatedCount: result.count,
      syncedEndCount,
      price: nextPrice,
    });
  }

  const variantId = body?.variantId?.trim();
  if (!variantId) {
    return NextResponse.json({ error: "Variant gerekli" }, { status: 400 });
  }

  const priceRaw = body?.price;
  if (priceRaw !== null && priceRaw !== undefined) {
    if (typeof priceRaw !== "number" || !Number.isFinite(priceRaw) || priceRaw < 0) {
      return NextResponse.json({ error: "Gecersiz fiyat" }, { status: 400 });
    }
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { family: true },
  });

  if (!variant) {
    return NextResponse.json({ error: "Variant bulunamadi" }, { status: 404 });
  }

  if (admin.brandId && admin.brandId !== variant.family.brandId) {
    return NextResponse.json({ error: "Bu markaya yetkiniz yok" }, { status: 403 });
  }

  const nextPrice = priceRaw == null ? null : Math.round(priceRaw);
  await prisma.productVariant.update({
    where: { id: variantId },
    data: { price: nextPrice },
  });

  let syncedEnd: { id: string; price: number } | null = null;
  if (variant.quality === "FIRST" && nextPrice != null) {
    syncedEnd = await syncEndPriceForFirstVariant({
      familyId: variant.familyId,
      size: variant.size,
      surface: variant.surface,
      price: nextPrice,
    });
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { lastPriceListUpdate: new Date() },
    create: { id: "default", lastPriceListUpdate: new Date() },
  });

  return NextResponse.json({
    ok: true,
    variantId,
    price: nextPrice,
    syncedEnd,
  });
}
