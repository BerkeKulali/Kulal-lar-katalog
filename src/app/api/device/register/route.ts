import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  return NextResponse.json(
    {
      error:
        "Plasiyer kaydı artık admin onaylı akışla yapılır. /api/device/register/salesperson/request kullanın.",
    },
    { status: 410 }
  );
}
