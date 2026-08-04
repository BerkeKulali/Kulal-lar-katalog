import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { istanbulDaysAgo, istanbulStartOfDay } from "@/lib/site-visits";
import { prisma } from "@/lib/prisma";

type Range = "today" | "7d" | "30d" | "all";

function parseRange(raw: string | null): Range {
  return raw === "today" || raw === "7d" || raw === "30d" ? raw : "all";
}

function rangeStart(range: Range): Date | null {
  if (range === "today") return istanbulStartOfDay();
  if (range === "7d") return istanbulDaysAgo(7);
  if (range === "30d") return istanbulDaysAgo(30);
  return null;
}

/**
 * Ürün ailesi bazında tıklanma sıralaması — dönem/marka/bayi-plasiyer
 * filtrelenebilir. FamilyClickEvent (olay bazlı kayıt) üzerinden gruplanır;
 * FamilyClickStat yalnızca ömür boyu sayaç tuttuğu için (tarih bilgisi yok)
 * dönem filtresi için kullanılamıyor.
 */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));
  const from = rangeStart(range);

  const actorTypeRaw = searchParams.get("actorType");
  const actorType =
    actorTypeRaw === "dealer" || actorTypeRaw === "salesperson" ? actorTypeRaw : null;

  // Marka yöneticisi yalnızca kendi markasını görür; süper admin seçebilir.
  const requestedBrandId = searchParams.get("brandId")?.trim() || null;
  const effectiveBrandId = auth.admin.brandId ?? requestedBrandId;

  const grouped = await prisma.familyClickEvent.groupBy({
    by: ["familyId"],
    where: {
      ...(from ? { createdAt: { gte: from } } : {}),
      ...(actorType ? { actorType } : {}),
      ...(effectiveBrandId ? { family: { brandId: effectiveBrandId } } : {}),
    },
    _sum: { count: true },
    _max: { createdAt: true },
    orderBy: { _sum: { count: "desc" } },
    take: 300,
  });

  const familyIds = grouped.map((g) => g.familyId);
  const families = await prisma.productFamily.findMany({
    where: { id: { in: familyIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      brand: { select: { name: true, slug: true } },
    },
  });
  const familyById = new Map(families.map((f) => [f.id, f]));

  const items = grouped
    .map((g) => {
      const family = familyById.get(g.familyId);
      if (!family) return null;
      return {
        familyId: g.familyId,
        count: g._sum.count ?? 0,
        updatedAt: (g._max.createdAt ?? new Date(0)).toISOString(),
        familyName: family.name,
        familySlug: family.slug,
        brandName: family.brand.name,
        brandSlug: family.brand.slug,
        isActive: family.isActive,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.count - a.count);

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return NextResponse.json({ items, total });
}
