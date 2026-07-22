import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-auth";
import { SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { getSalespersonShowStock } from "@/lib/salesperson-stock";

export const dynamic = "force-dynamic";

export async function GET() {
  const salespersonId = (await cookies()).get(SALESPERSON_ID_COOKIE)?.value;
  // Admin girişinde stok her zaman görünür; aksi halde plasiyer yetkisi.
  const admin = await getAdminSession();
  const showStock = admin ? true : await getSalespersonShowStock(salespersonId);

  return NextResponse.json({ showStock });
}
