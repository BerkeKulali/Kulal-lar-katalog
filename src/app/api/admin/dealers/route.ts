import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const [dealers, legacyDevices] = await Promise.all([
    prisma.dealer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        approvedByAdmin: { select: { id: true, name: true } },
        devices: {
          select: { id: true, label: true, lastSeenAt: true, registeredAt: true },
          orderBy: { lastSeenAt: "desc" },
          take: 10,
        },
        _count: { select: { devices: true } },
      },
      take: 300,
    }),
    // Kullanıcı adı/şifre modelinden önce (anında kayıt döneminde) oluşmuş,
    // hiçbir Dealer hesabına bağlı olmayan bayi cihazları. Geriye dönük
    // uyumluluk için burada gösterilmeye devam eder.
    prisma.device.findMany({
      where: { salespersonId: null, dealerId: null },
      orderBy: { registeredAt: "desc" },
      select: {
        id: true,
        label: true,
        registeredAt: true,
        lastSeenAt: true,
        showStock: true,
        filterToolEnabled: true,
      },
      take: 300,
    }),
  ]);

  return NextResponse.json({
    dealers: dealers.map((d) => ({
      id: d.id,
      name: d.name,
      username: d.username,
      status: d.status,
      isActive: d.isActive,
      showStock: d.showStock,
      filterToolEnabled: d.filterToolEnabled,
      rejectionReason: d.rejectionReason,
      approvedBy: d.approvedByAdmin?.name ?? null,
      approvedAt: d.approvedAt,
      createdAt: d.createdAt,
      deviceCount: d._count.devices,
      lastSeenAt: d.devices[0]?.lastSeenAt ?? null,
    })),
    legacyDevices: legacyDevices.map((d) => ({
      id: d.id,
      label: d.label,
      registeredAt: d.registeredAt,
      lastSeenAt: d.lastSeenAt,
      showStock: d.showStock,
      filterToolEnabled: d.filterToolEnabled,
    })),
  });
}
