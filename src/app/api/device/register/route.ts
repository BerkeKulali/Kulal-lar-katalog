import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { salespersonId, label } = body;

    if (!salespersonId) {
      return NextResponse.json({ error: "Plasiyer gerekli" }, { status: 400 });
    }

    const salesperson = await prisma.salesperson.findUnique({
      where: { id: salespersonId },
    });

    if (!salesperson) {
      return NextResponse.json({ error: "Plasiyer bulunamadı" }, { status: 404 });
    }

    const device = await prisma.device.create({
      data: {
        salespersonId,
        label: label ?? `Tablet - ${salesperson.name}`,
      },
    });

    const response = NextResponse.json({
      token: device.token,
      deviceId: device.id,
    });

    const opts = deviceCookieOptions();
    response.cookies.set(DEVICE_TOKEN_COOKIE, device.token, opts);
    response.cookies.set(SALESPERSON_ID_COOKIE, salesperson.id, opts);
    response.cookies.set(SALESPERSON_NAME_COOKIE, salesperson.name, opts);

    return response;
  } catch (err) {
    console.error("POST /api/device/register failed:", err);
    const message =
      err instanceof Error ? err.message : "Tablet kaydı oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
