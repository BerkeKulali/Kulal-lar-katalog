import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { orderBrandFilter } from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const orders = await prisma.order.findMany({
    where: orderBrandFilter(auth.admin.brandId),
    include: {
      salesperson: true,
      approvedByAdmin: { select: { id: true, name: true } },
      lines: { select: { id: true, quantityM2: true, unitPriceSnapshot: true } },
      _count: { select: { lines: true, adminLogs: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}
