import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const deviceToken = (await cookies()).get(DEVICE_TOKEN_COOKIE)?.value;
  if (!deviceToken) {
    return NextResponse.json({ error: "Cihaz kaydı yok" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({
    where: { token: deviceToken },
    select: { id: true, salespersonId: true },
  });

  if (!device) {
    return NextResponse.json({ error: "Cihaz bulunamadı" }, { status: 404 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.siteVisit.create({
      data: {
        deviceId: device.id,
        salespersonId: device.salespersonId,
      },
    }),
    prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
