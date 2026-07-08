import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { prisma } from "@/lib/prisma";
import { buildCatalogSync } from "@/lib/sync-server";

export const dynamic = "force-dynamic";

// "Son görülme" için mevcut sync çağrısına binen, throttle'lı heartbeat.
const LAST_SEEN_THROTTLE_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;

  if (sinceParam && since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Geçersiz since" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  // Yeni istek atmadan, yalnızca gerçekten eskiyse tek koşullu yazım yapar.
  // Serverless'te fire-and-forget yazımlar düşebildiği için await ediyoruz.
  if (deviceToken) {
    try {
      await prisma.device.updateMany({
        where: {
          token: deviceToken,
          lastSeenAt: { lt: new Date(Date.now() - LAST_SEEN_THROTTLE_MS) },
        },
        data: { lastSeenAt: new Date() },
      });
    } catch {
      // takip güncellemesi kritik değil; senkronu bloklamaz
    }
  }

  const payload = await buildCatalogSync(since, salespersonId);
  return NextResponse.json(payload);
}
