import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { syncGuralEndPricesAndPackaging } from "@/lib/gural-sync";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

export async function POST() {
  const auth = await requireAdminPermission("prices");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  if (admin.brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: admin.brandId },
    });
    if (brand?.slug !== "gural") {
      return NextResponse.json(
        { error: "Bu işlem yalnızca GÜRAL markası için kullanılabilir" },
        { status: 403 }
      );
    }
  }

  try {
    const result = await syncGuralEndPricesAndPackaging();
    invalidateCatalogCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Senkronizasyon hatası" },
      { status: 500 }
    );
  }
}
