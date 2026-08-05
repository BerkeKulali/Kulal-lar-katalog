import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/** Duyuru listesi (ana sayfa banner). Yetki: campaigns. */
export async function GET() {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const announcements = await prisma.announcement.findMany({
    include: { brand: { select: { id: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ announcements });
}

/** Yeni (manuel) duyuru oluştur. Yetki: campaigns. */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const rawBody = String(body?.body ?? "").trim();
  const isActive = body?.isActive !== false;
  const sortOrder = Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : 0;

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body: rawBody || null,
      isActive,
      sortOrder,
    },
  });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "announcement.create",
      entityType: "announcement",
      entityId: announcement.id,
      summary: `Duyuru oluşturuldu: ${title}`,
    }
  );

  return NextResponse.json({ announcement }, { status: 201 });
}
