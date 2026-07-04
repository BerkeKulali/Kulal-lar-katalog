import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { normalizeSize } from "@/lib/constants";
import {
  countMatrixVariants,
  matrixFromUniform,
  matrixSizes,
  normalizeMatrix,
  normalizePackaging,
  type PackagingBySize,
  type SurfaceMatrix,
} from "@/lib/family-matrix";
import { variantCode } from "@/lib/prices";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { toSurface } from "@/lib/surface";
import type { Quality, Surface } from "@/generated/prisma/client";

const ALL_QUALITIES: Quality[] = ["FIRST", "END"];

function resolveMatrix(
  brandSlug: string,
  body: {
    matrix?: SurfaceMatrix;
    sizes?: string[];
    surfaces?: string[];
  }
): SurfaceMatrix | null {
  if (body.matrix && Object.keys(body.matrix).length > 0) {
    return normalizeMatrix(body.matrix, brandSlug);
  }

  if (body.sizes?.length && body.surfaces?.length) {
    return matrixFromUniform(body.sizes, body.surfaces, brandSlug);
  }

  return null;
}

export async function GET() {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const families = await prisma.productFamily.findMany({
    where: admin.brandId ? { brandId: admin.brandId } : undefined,
    include: {
      brand: { select: { name: true, slug: true } },
      _count: { select: { variants: true } },
    },
    orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({
    families: families.map((f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      brandName: f.brand.name,
      brandSlug: f.brand.slug,
      variantCount: f._count.variants,
      isActive: f.isActive,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminPermission("families");
    if (!auth.admin) return auth.response;
    const admin = auth.admin;

    const body = await request.json();
    const { brandSlug, name, sizes, surfaces, matrix, packaging } = body as {
      brandSlug: string;
      name: string;
      sizes?: string[];
      surfaces?: string[];
      matrix?: SurfaceMatrix;
      packaging?: PackagingBySize;
    };

    const trimmedName = name?.trim().toUpperCase();
    if (!trimmedName) {
      return NextResponse.json({ error: "Ürün ailesi adı gerekli" }, { status: 400 });
    }

    if (!brandSlug?.trim()) {
      return NextResponse.json({ error: "Marka gerekli" }, { status: 400 });
    }

    const resolvedMatrix = resolveMatrix(brandSlug.trim().toLowerCase(), {
      matrix,
      sizes,
      surfaces,
    });
    if (!resolvedMatrix || Object.keys(resolvedMatrix).length === 0) {
      return NextResponse.json(
        { error: "En az bir ölçü ve yüzey kombinasyonu seçin" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { slug: brandSlug.trim().toLowerCase() },
    });

    if (!brand) {
      return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
    }

    if (admin.brandId && admin.brandId !== brand.id) {
      return NextResponse.json({ error: "Bu markaya yetkiniz yok" }, { status: 403 });
    }

    const slug = slugify(trimmedName);
    const existing = await prisma.productFamily.findFirst({
      where: { brandId: brand.id, slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu markada aynı isimde ürün ailesi zaten var" },
        { status: 409 }
      );
    }

    const variantCreates: {
      size: string;
      surface: Surface;
      quality: Quality;
      code: string;
      palletM2: number | null;
      boxM2: number | null;
      truckM2: number | null;
    }[] = [];

    const normalizedPackaging = normalizePackaging(
      packaging,
      matrixSizes(resolvedMatrix)
    );

    for (const [size, surfaceList] of Object.entries(resolvedMatrix)) {
      const pack = normalizedPackaging[size] ?? {};
      for (const surface of surfaceList) {
        for (const quality of ALL_QUALITIES) {
          variantCreates.push({
            size,
            surface: toSurface(surface),
            quality,
            code: variantCode(trimmedName, toSurface(surface), quality),
            palletM2: pack.palletM2 ?? null,
            boxM2: pack.boxM2 ?? null,
            truckM2: pack.truckM2 ?? null,
          });
        }
      }
    }

    const family = await prisma.$transaction(async (tx) => {
      const created = await tx.productFamily.create({
        data: {
          brandId: brand.id,
          name: trimmedName,
          slug,
        },
        include: { brand: true },
      });

      await tx.productVariant.createMany({
        data: variantCreates.map((variant) => ({
          ...variant,
          familyId: created.id,
        })),
      });

      const variants = await tx.productVariant.findMany({
        where: { familyId: created.id },
      });

      return { ...created, variants };
    });

    return NextResponse.json({
      ok: true,
      family: {
        id: family.id,
        name: family.name,
        slug: family.slug,
        brandSlug: family.brand.slug,
        variantCount: family.variants.length,
      },
      createdVariants: variantCreates.length,
    });
  } catch (err) {
    console.error("POST /api/admin/families failed:", err);
    const message =
      err instanceof Error ? err.message : "Ürün ailesi oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
