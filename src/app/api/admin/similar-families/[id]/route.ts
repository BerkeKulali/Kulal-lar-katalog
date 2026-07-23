import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { getSimilarFamilies, saveSimilarFamilies } from "@/lib/similar-families";

type RouteContext = { params: Promise<{ id: string }> };

/** Ailenin sahibi admin bu markayı düzenleyebilir mi? */
async function canEditFamily(
  familyId: string,
  adminBrandId: string | null
): Promise<boolean> {
  const family = await prisma.productFamily.findUnique({
    where: { id: familyId },
    select: { brandId: true },
  });
  if (!family) return false;
  if (!adminBrandId) return true;
  return family.brandId === adminBrandId;
}

/** Ailenin mevcut benzer ürünleri (düzenleme için; audience filtresi yok). */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  if (!(await canEditFamily(id, auth.admin.brandId))) {
    return NextResponse.json({ error: "Erişim yok" }, { status: 403 });
  }

  const items = await getSimilarFamilies(id);
  return NextResponse.json({ items });
}

/** Ailenin benzer ürün kümesini yeniden yazar (simetrik). */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  if (!(await canEditFamily(id, auth.admin.brandId))) {
    return NextResponse.json({ error: "Erişim yok" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawIds = (body as { similarIds?: unknown })?.similarIds;
  const similarIds = Array.isArray(rawIds)
    ? rawIds.filter((x): x is string => typeof x === "string")
    : [];

  const { saved } = await saveSimilarFamilies(id, similarIds);
  invalidateCatalogCache();

  return NextResponse.json({ saved });
}
