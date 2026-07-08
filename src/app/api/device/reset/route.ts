import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/admin-auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

export async function POST() {
  // Production'da cihaz sıfırlama yalnızca admin oturumuyla yapılabilir;
  // aksi halde kilitli bir tablet kendini sıfırlayıp başka kimlikle girebilir.
  if (process.env.NODE_ENV === "production") {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json(
        { error: "Cihaz sıfırlama için admin girişi gerekli" },
        { status: 401 }
      );
    }
  }

  const cookieStore = await cookies();
  const clear = { path: "/", maxAge: 0 };

  cookieStore.set(DEVICE_AUTH_COOKIE, "", clear);
  cookieStore.set(DEVICE_TOKEN_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_ID_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_NAME_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, "", clear);
  cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", clear);
  cookieStore.set(ADMIN_SESSION_COOKIE, "", clear);

  return NextResponse.json({ ok: true });
}
