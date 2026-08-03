import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Kayıtlı segmenti sil. Yetki: campaigns. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.productFilterPreset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Segment bulunamadı" }, { status: 404 });
  }

  await prisma.productFilterPreset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
