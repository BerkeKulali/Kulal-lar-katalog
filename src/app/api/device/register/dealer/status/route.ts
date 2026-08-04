import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_REQUEST_TOKEN_COOKIE } from "@/lib/device-cookie";
import { getAccessRequestByToken } from "@/lib/device-access";

export async function GET() {
  const token = (await cookies()).get(DEVICE_REQUEST_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ status: "NONE" });
  }

  const request = await getAccessRequestByToken(token);
  if (!request || request.type !== "DEALER") {
    return NextResponse.json({ status: "NONE" });
  }

  return NextResponse.json({
    status: request.status,
    dealerName: request.dealerName ?? null,
    rejectionReason: request.rejectionReason ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
  });
}
