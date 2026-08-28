import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { pruneDuplicateDevices } from "@/lib/device-lock";
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

  await pruneDuplicateDevices();

  // NOT: include yerine bilinçli olarak select kullanılıyor - schema'ya
  // yeni bir alan eklendiğinde include TÜM scalar kolonları otomatik seçer
  // (bkz. src/lib/salesperson-account.ts üstündeki not); burada yalnızca
  // gerçekten kullanılan alanlar listelenir, blast radius'u sınırlı tutar.
  const salespeople = await prisma.salesperson.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      showStock: true,
      filterToolEnabled: true,
      lockedDeviceId: true,
      username: true,
      createdAt: true,
      lockedDevice: {
        select: {
          id: true,
          label: true,
          lastSeenAt: true,
          registeredAt: true,
        },
      },
      _count: { select: { orders: true, visits: true, devices: true } },
    },
  });

  return NextResponse.json({
    salespeople: salespeople.map((sp) => ({
      id: sp.id,
      name: sp.name,
      isActive: sp.isActive,
      showStock: sp.showStock,
      filterToolEnabled: sp.filterToolEnabled,
      orderCount: sp._count.orders,
      visitCount: sp._count.visits,
      isTabletLocked: Boolean(sp.lockedDeviceId),
      lockedDevice: sp.lockedDevice,
      username: sp.username,
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
    select: {
      id: true,
      name: true,
      isActive: true,
      showStock: true,
      filterToolEnabled: true,
    },
  });

  return NextResponse.json({
    ok: true,
    salesperson: {
      id: salesperson.id,
      name: salesperson.name,
      isActive: salesperson.isActive,
      showStock: salesperson.showStock,
      filterToolEnabled: salesperson.filterToolEnabled,
      orderCount: 0,
      visitCount: 0,
      isTabletLocked: false,
      lockedDevice: null,
      username: null,
      deviceCount: 0,
    },
  });
}
