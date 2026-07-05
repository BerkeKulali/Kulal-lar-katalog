import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unlockSalespersonTablet } from "@/lib/device-lock";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.salesperson.findUnique({
    where: { id },
    select: { id: true, name: true, lockedDeviceId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Plasiyer bulunamadı" }, { status: 404 });
  }

  if (!existing.lockedDeviceId) {
    return NextResponse.json({
      ok: true,
      message: "Plasiyerin aktif tablet kilidi yok",
    });
  }

  await unlockSalespersonTablet(id);

  return NextResponse.json({
    ok: true,
    message: `"${existing.name}" için tablet kilidi kaldırıldı`,
  });
}
