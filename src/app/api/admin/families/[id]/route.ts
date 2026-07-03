import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  buildVariantPlan,
  isUniformMatrix,
  matrixFromUniform,
  matrixSizes,
  normalizeMatrix,
  normalizePackaging,
  variantsToMatrix,
  variantsToPackaging,
  type PackagingBySize,
  type SurfaceMatrix,
} from "@/lib/family-matrix";
import { variantCode } from "@/lib/prices";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { Quality, Surface } from "@/generated/prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

async function loadFamilyForAdmin(id: string, adminBrandId: string | null) {
  const family = await prisma.productFamily.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      variants: {
        select: {
          id: true,
          size: true,
          surface: true,
          quality: true,
          palletM2: true,
          boxM2: true,
          truckM2: true,
          _count: { select: { orderLines: true } },
        },
      },
    },
  });

  if (!family) return null;
  if (adminBrandId && adminBrandId !== family.brandId) return null;

  return family;
}

function resolveMatrixForPatch(
  brandSlug: string,
  body: { matrix?: SurfaceMatrix; sizes?: string[]; surfaces?: string[] },
  existingVariants: { size: string; surface: Surface }[]
): SurfaceMatrix | null {
  if (body.matrix !== undefined) {
    return normalizeMatrix(body.matrix, brandSlug);
  }

  if (body.sizes !== undefined || body.surfaces !== undefined) {
    const current = variantsToMatrix(existingVariants);
    const sizes =
      body.sizes !== undefined ? body.sizes : matrixSizes(current);
    const surfaces =
      body.surfaces !== undefined
        ? body.surfaces
        : [...new Set(existingVariants.map((v) => v.surface))];
    return matrixFromUniform(sizes, surfaces, brandSlug);
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminPermission("families");
    if (!auth.admin) return auth.response;
    const admin = auth.admin;

    const { id } = await context.params;
    const family = await loadFamilyForAdmin(id, admin.brandId);

    if (!family) {
      return NextResponse.json(
        { error: "Ürün ailesi bulunamadı" },
        { status: 404 }
      );
    }

    const matrix = variantsToMatrix(family.variants);
    const uniform = isUniformMatrix(matrix);
    const sizes = matrixSizes(matrix);
    const surfaces =
      uniform && sizes.length > 0 ? (matrix[sizes[0]] ?? []) : [];

    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        slug: family.slug,
        brandName: family.brand.name,
        brandSlug: family.brand.slug,
        matrix,
        packaging: variantsToPackaging(family.variants),
        surfaceMode: uniform ? "uniform" : "perSize",
        sizes,
        surfaces,
        variantCount: family.variants.length,
        hasOrders: family.variants.some((v) => v._count.orderLines > 0),
        isActive: family.isActive,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/families/[id] failed:", err);
    const message =
      err instanceof Error ? err.message : "Ürün ailesi yüklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminPermission("families");
    if (!auth.admin) return auth.response;
    const admin = auth.admin;

    const { id } = await context.params;
    const family = await loadFamilyForAdmin(id, admin.brandId);

    if (!family) {
      return NextResponse.json({ error: "Ürün ailesi bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { name, sizes, surfaces, matrix, brandSlug, packaging, isActive } =
      body as {
      name?: string;
      sizes?: string[];
      surfaces?: string[];
      matrix?: SurfaceMatrix;
      brandSlug?: string;
      packaging?: PackagingBySize;
      isActive?: boolean;
    };

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive geçersiz" },
        { status: 400 }
      );
    }

    const onlyStatusUpdate =
      isActive !== undefined &&
      name === undefined &&
      brandSlug === undefined &&
      matrix === undefined &&
      sizes === undefined &&
      surfaces === undefined &&
      packaging === undefined;

    if (onlyStatusUpdate) {
      const updated = await prisma.productFamily.update({
        where: { id: family.id },
        data: { isActive },
        include: {
          brand: { select: { name: true, slug: true } },
          _count: { select: { variants: true } },
        },
      });

      return NextResponse.json({
        ok: true,
        family: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          brandName: updated.brand.name,
          brandSlug: updated.brand.slug,
          variantCount: updated._count.variants,
          isActive: updated.isActive,
        },
      });
    }

    const updates: {
      name?: string;
      slug?: string;
      brandId?: string;
      isActive?: boolean;
    } = {};
    let targetBrandId = family.brandId;
    let targetBrandSlug = family.brand.slug;

    if (brandSlug !== undefined) {
      const brand = await prisma.brand.findUnique({
        where: { slug: brandSlug.trim().toLowerCase() },
      });

      if (!brand) {
        return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
      }

      if (admin.brandId && admin.brandId !== brand.id) {
        return NextResponse.json(
          { error: "Bu markaya yetkiniz yok" },
          { status: 403 }
        );
      }

      targetBrandId = brand.id;
      targetBrandSlug = brand.slug;
      if (brand.id !== family.brandId) {
        updates.brandId = brand.id;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (name !== undefined) {
      const trimmedName = name.trim().toUpperCase();
      if (!trimmedName) {
        return NextResponse.json({ error: "Ürün adı boş olamaz" }, { status: 400 });
      }

      updates.name = trimmedName;
      updates.slug = slugify(trimmedName);
    }

    const targetSlug = updates.slug ?? family.slug;

    if (updates.name || updates.brandId) {
      const conflict = await prisma.productFamily.findFirst({
        where: {
          brandId: targetBrandId,
          slug: targetSlug,
          NOT: { id: family.id },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Hedef markada aynı isimde başka bir ürün var" },
          { status: 409 }
        );
      }
    }

    const resolvedMatrix =
      resolveMatrixForPatch(
        targetBrandSlug,
        { matrix, sizes, surfaces },
        family.variants
      ) ?? variantsToMatrix(family.variants);

    if (Object.keys(resolvedMatrix).length === 0) {
      return NextResponse.json(
        { error: "En az bir ölçü ve yüzey kombinasyonu seçin" },
        { status: 400 }
      );
    }

    const familyName = updates.name ?? family.name;
    const matrixSizesList = matrixSizes(resolvedMatrix);
    const normalizedPackaging = normalizePackaging(packaging, matrixSizesList);

    const { toCreate, toRemove } = buildVariantPlan(
      resolvedMatrix,
      familyName,
      family.variants,
      family.id,
      variantCode
    );

    const blocked = toRemove.filter(
      (v) => (v._count?.orderLines ?? 0) > 0
    );
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error:
            "Siparişe bağlı variant silinemez. Önce ilgili siparişleri kontrol edin.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.productFamily.update({
          where: { id: family.id },
          data: updates,
        });

        if (updates.name) {
          const variants = await tx.productVariant.findMany({
            where: { familyId: family.id },
          });
          for (const v of variants) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { code: variantCode(familyName, v.surface, v.quality) },
            });
          }
        }
      }

      if (toCreate.length > 0) {
        const createRows = toCreate.map((row) => {
          const pack = normalizedPackaging[row.size] ?? {};
          return {
            ...row,
            palletM2: pack.palletM2 ?? null,
            boxM2: pack.boxM2 ?? null,
            truckM2: pack.truckM2 ?? null,
          };
        });
        await tx.productVariant.createMany({ data: createRows });
      }

      if (toRemove.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: toRemove.map((v) => v.id) } },
        });
      }

      for (const [size, pack] of Object.entries(normalizedPackaging)) {
        await tx.productVariant.updateMany({
          where: { familyId: family.id, size },
          data: {
            palletM2: pack.palletM2 ?? null,
            boxM2: pack.boxM2 ?? null,
            truckM2: pack.truckM2 ?? null,
          },
        });
      }
    });

    const updated = await prisma.productFamily.findUnique({
      where: { id: family.id },
      include: {
        brand: { select: { name: true, slug: true } },
        _count: { select: { variants: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      family: {
        id: family.id,
        name: updated?.name ?? familyName,
        slug: updated?.slug ?? family.slug,
        brandName: updated?.brand.name,
        brandSlug: updated?.brand.slug,
        variantCount: updated?._count.variants ?? 0,
        isActive: updated?.isActive ?? family.isActive,
      },
      addedVariants: toCreate.length,
      removedVariants: toRemove.length,
      brandChanged: Boolean(updates.brandId),
    });
  } catch (err) {
    console.error("PATCH /api/admin/families/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Güncelleme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAdminPermission("families");
    if (!auth.admin) return auth.response;
    const admin = auth.admin;

    const { id } = await context.params;
    const family = await loadFamilyForAdmin(id, admin.brandId);

    if (!family) {
      return NextResponse.json({ error: "Ürün ailesi bulunamadı" }, { status: 404 });
    }

    const hasOrders = family.variants.some((v) => v._count.orderLines > 0);
    if (hasOrders) {
      return NextResponse.json(
        {
          error:
            "Bu ürün ailesine bağlı sipariş satırları var; silinemez.",
        },
        { status: 409 }
      );
    }

    await prisma.productFamily.delete({ where: { id: family.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/families/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Silme başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
