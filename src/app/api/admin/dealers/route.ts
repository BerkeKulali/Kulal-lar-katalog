import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const dealers = await prisma.accessRequest.findMany({
    where: { type: "DEALER" },
    orderBy: { createdAt: "desc" },
    include: {
      approvedByAdmin: { select: { id: true, name: true } },
      device: {
        select: {
          id: true,
          label: true,
          registeredAt: true,
          lastSeenAt: true,
        },
      },
    },
    take: 300,
  });

  return NextResponse.json({
    dealers: dealers.map((req) => ({
      id: req.id,
      status: req.status,
      dealerName: req.dealerName ?? req.requestLabel,
      requestLabel: req.requestLabel,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
      completedAt: req.completedAt,
      rejectionReason: req.rejectionReason,
      approvedBy: req.approvedByAdmin?.name ?? null,
      device: req.device,
    })),
  });
}
