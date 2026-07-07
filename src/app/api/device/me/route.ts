import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { getSalespersonShowStock } from "@/lib/salesperson-stock";

export const dynamic = "force-dynamic";

export async function GET() {
  const salespersonId = (await cookies()).get(SALESPERSON_ID_COOKIE)?.value;
  const showStock = await getSalespersonShowStock(salespersonId);

  return NextResponse.json({ showStock });
}
