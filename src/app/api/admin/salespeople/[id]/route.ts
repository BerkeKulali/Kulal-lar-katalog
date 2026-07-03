import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return null;
  return name;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.salesperson.findUnique({
    where: { id },
    include: { _count: { select: { orders: true, devices: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Plasiyer bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: { name?: string; isActive?: boolean } = {};

  if (body.name !== undefined) {
    const name = normalizeName(body.name);
    if (!name) {
      return NextResponse.json(
        { error: "Geçerli bir isim girin (en az 2 karakter)" },
        { status: 400 }
      );
    }
    data.name = name;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const salesperson = await prisma.salesperson.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    ok: true,
    salesperson: {
      id: salesperson.id,
      name: salesperson.name,
      isActive: salesperson.isActive,
      orderCount: existing._count.orders,
      deviceCount: existing._count.devices,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.salesperson.findUnique({
    where: { id },
    include: { _count: { select: { orders: true, devices: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Plasiyer bulunamadı" }, { status: 404 });
  }

  const hasHistory =
    existing._count.orders > 0 || existing._count.devices > 0;

  if (hasHistory) {
    const salesperson = await prisma.salesperson.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      ok: true,
      deactivated: true,
      salesperson: {
        id: salesperson.id,
        name: salesperson.name,
        isActive: salesperson.isActive,
        orderCount: existing._count.orders,
        deviceCount: existing._count.devices,
      },
    });
  }

  await prisma.salesperson.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
