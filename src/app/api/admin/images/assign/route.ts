import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { normalizeSize } from "@/lib/constants";
import { DISTINCT_IMAGE_SIZES } from "@/lib/product-image";

type AssignTarget = "family" | "variant" | "size";

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission("images");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json();
  const {
    target,
    familyId,
    variantId,
    size,
    imageUrl,
    imagePublicId,
  } = body as {
    target: AssignTarget;
    familyId?: string;
    variantId?: string;
    size?: string;
    imageUrl: string;
    imagePublicId?: string;
  };

  if (!imageUrl?.trim()) {
    return NextResponse.json({ error: "Görsel URL gerekli" }, { status: 400 });
  }

  const imageData = {
    imageUrl: imageUrl.trim(),
    imagePublicId: imagePublicId?.trim() || null,
    imageUpdatedAt: new Date(),
  };

  if (target === "variant") {
    if (!variantId) {
      return NextResponse.json({ error: "Variant gerekli" }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { family: { include: { brand: true } } },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant bulunamadı" }, { status: 404 });
    }

    if (admin.brandId && admin.brandId !== variant.family.brandId) {
      return NextResponse.json({ error: "Bu markaya yetkiniz yok" }, { status: 403 });
    }

    await prisma.productVariant.update({
      where: { id: variantId },
      data: imageData,
    });

    invalidateCatalogCache();
    return NextResponse.json({ ok: true, updated: 1 });
  }

  if (!familyId) {
    return NextResponse.json({ error: "Ürün ailesi gerekli" }, { status: 400 });
  }

  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
    include: { brand: true },
  });

  if (!family) {
    return NextResponse.json({ error: "Ürün ailesi bulunamadı" }, { status: 404 });
  }

  if (admin.brandId && admin.brandId !== family.brandId) {
    return NextResponse.json({ error: "Bu markaya yetkiniz yok" }, { status: 403 });
  }

  if (target === "family") {
    await prisma.$transaction([
      prisma.productFamily.update({
        where: { id: familyId },
        data: imageData,
      }),
      prisma.productVariant.updateMany({
        where: {
          familyId,
          size: { notIn: [...DISTINCT_IMAGE_SIZES] },
        },
        data: imageData,
      }),
    ]);
    invalidateCatalogCache();
    return NextResponse.json({ ok: true, updated: "family+variants" });
  }

  if (target === "size") {
    const normalized = normalizeSize(size ?? "");
    if (!normalized) {
      return NextResponse.json({ error: "Ölçü gerekli" }, { status: 400 });
    }

    const result = await prisma.productVariant.updateMany({
      where: { familyId, size: normalized },
      data: imageData,
    });

    invalidateCatalogCache();
    return NextResponse.json({
      ok: true,
      updated: result.count,
    });
  }

  return NextResponse.json({ error: "Geçersiz hedef" }, { status: 400 });
}
