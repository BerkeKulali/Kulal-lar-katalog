import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "kulalilar_admin";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Geçersiz giriş" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
