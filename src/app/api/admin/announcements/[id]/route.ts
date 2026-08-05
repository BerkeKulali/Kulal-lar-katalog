import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/** Duyuru güncelle (başlık/metin/aktiflik/sıra). Yetki: campaigns. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;
  const { id } = await params;

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: {
    title?: string;
    body?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  } = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
    }
    data.title = title;
  }
  if (typeof body?.body === "string") {
    data.body = body.body.trim() || null;
  }
  if (typeof body?.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (Number.isFinite(body?.sortOrder)) {
    data.sortOrder = Number(body.sortOrder);
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data,
  });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "announcement.update",
      entityType: "announcement",
      entityId: id,
      summary: `Duyuru güncellendi: ${announcement.title}`,
    }
  );

  return NextResponse.json({ announcement });
}

/** Duyuru sil. Yetki: campaigns. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;
  const { id } = await params;

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 });
  }

  await prisma.announcement.delete({ where: { id } });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "announcement.delete",
      entityType: "announcement",
      entityId: id,
      summary: `Duyuru silindi: ${existing.title}`,
    }
  );

  return NextResponse.json({ ok: true });
}
