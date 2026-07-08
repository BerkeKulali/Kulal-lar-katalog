import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      salesperson: { select: { id: true, name: true } },
      approvedByAdmin: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    requests: requests.map((req) => ({
      id: req.id,
      type: req.type,
      status: req.status,
      dealerName: req.dealerName,
      requestLabel: req.requestLabel,
      salesperson: req.salesperson,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt,
      approvedAt: req.approvedAt,
      completedAt: req.completedAt,
      approvedBy: req.approvedByAdmin?.name ?? null,
    })),
  });
}
