import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Netsis stok senkron geçmişi. Yetki: stock. */
export async function GET() {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;

  const logs = await prisma.netsisSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      source: true,
      fileName: true,
      totalCodes: true,
      matchedCodes: true,
      unmatchedCount: true,
      variantsUpdated: true,
      lockedSkipped: true,
      zeroBalance: true,
      dryRun: true,
      ok: true,
      message: true,
      unmatchedSample: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    items: logs.map((l) => ({
      ...l,
      unmatchedSample: l.unmatchedSample
        ? (JSON.parse(l.unmatchedSample) as string[])
        : [],
    })),
  });
}
