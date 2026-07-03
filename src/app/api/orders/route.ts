import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
} from "@/lib/device-cookie";
import { generateOrderNumber } from "@/lib/utils";

export async function GET() {
  const orders = await prisma.order.findMany({
    include: {
      salesperson: true,
      lines: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { dealerName, notes, items } = body;

  const cookieStore = await cookies();
  const deviceToken =
    body.deviceToken ?? cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const salespersonId =
    body.salespersonId ?? cookieStore.get(SALESPERSON_ID_COOKIE)?.value;

  if (!dealerName?.trim()) {
    return NextResponse.json({ error: "Bayi adı gerekli" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Ürün listesi boş" }, { status: 400 });
  }

  if (deviceToken) {
    await prisma.device.updateMany({
      where: { token: deviceToken },
      data: { lastSeenAt: new Date() },
    });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      dealerName: dealerName.trim(),
      notes: notes?.trim() || null,
      salespersonId: salespersonId || null,
      lines: {
        create: items.map(
          (item: {
            variantId: string;
            quantityM2: number;
            unitPriceSnapshot: number;
            productLabel: string;
          }) => ({
            variantId: item.variantId,
            quantityM2: item.quantityM2,
            unitPriceSnapshot: item.unitPriceSnapshot,
            productLabel: item.productLabel,
          })
        ),
      },
    },
  });

  return NextResponse.json({
    orderNumber: order.orderNumber,
    id: order.id,
  });
}
