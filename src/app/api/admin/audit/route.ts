import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Admin denetim izi listesi. Yetki: admins (yönetici yönetimi). */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(q
        ? { OR: [{ adminName: { contains: q } }, { summary: { contains: q } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      adminName: true,
      action: true,
      entityType: true,
      summary: true,
      createdAt: true,
    },
  });

  // Filtre menüsü için mevcut action'lar.
  const actions = await prisma.adminAuditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({
    items: logs,
    actions: actions.map((a) => a.action),
  });
}
