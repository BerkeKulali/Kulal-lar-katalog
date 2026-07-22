import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-auth";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const admin = await getAdminSession();
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    salespersonId,
    deviceToken,
  });

  return NextResponse.json({ showStock });
}
