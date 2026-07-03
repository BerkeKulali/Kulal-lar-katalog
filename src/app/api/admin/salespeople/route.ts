import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return null;
  return name;
}

export async function GET() {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const salespeople = await prisma.salesperson.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { orders: true, devices: true } },
    },
  });

  return NextResponse.json({
    salespeople: salespeople.map((sp) => ({
      id: sp.id,
      name: sp.name,
      isActive: sp.isActive,
      orderCount: sp._count.orders,
      deviceCount: sp._count.devices,
      createdAt: sp.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  if (!name) {
    return NextResponse.json(
      { error: "Geçerli bir isim girin (en az 2 karakter)" },
      { status: 400 }
    );
  }

  const salesperson = await prisma.salesperson.create({
    data: { name, isActive: true },
  });

  return NextResponse.json({
    ok: true,
    salesperson: {
      id: salesperson.id,
      name: salesperson.name,
      isActive: salesperson.isActive,
      orderCount: 0,
      deviceCount: 0,
    },
  });
}
