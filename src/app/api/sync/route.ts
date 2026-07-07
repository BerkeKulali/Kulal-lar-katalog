import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { buildCatalogSync } from "@/lib/sync-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;

  if (sinceParam && since && Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Geçersiz since" }, { status: 400 });
  }

  const salespersonId = (await cookies()).get(SALESPERSON_ID_COOKIE)?.value;

  const payload = await buildCatalogSync(since, salespersonId);
  return NextResponse.json(payload);
}
