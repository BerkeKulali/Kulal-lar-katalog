import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { touchDevice } from "@/lib/device-activity";
import { getAdminSession } from "@/lib/admin-auth";
import { buildCatalogSync } from "@/lib/sync-server";

export const dynamic = "force-dynamic";

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

  // Mevcut sync çağrısına binen, throttle'lı "son görülme" heartbeat'i.
  await touchDevice(deviceToken);

  // Admin cookie'si olmayan ziyaretçilerde DB'ye gitmeden null döner.
  const admin = await getAdminSession();
  const payload = await buildCatalogSync(since, salespersonId, Boolean(admin));
  return NextResponse.json(payload);
}
