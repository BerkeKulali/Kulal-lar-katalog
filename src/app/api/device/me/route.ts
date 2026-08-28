import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const admin = await getAdminSession();
  const [showStock, settings] = await Promise.all([
    resolveStockVisibility({ isAdmin: Boolean(admin), deviceToken }),
    getAppSettings(),
  ]);

  return NextResponse.json({
    showStock,
    salesEnabled: settings.salesEnabled ?? true,
  });
}
