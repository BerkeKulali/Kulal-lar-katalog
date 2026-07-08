import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

const ADMIN_COOKIE = "kulalilar_admin";

export async function POST() {
  const cookieStore = await cookies();
  const clear = { path: "/", maxAge: 0 };

  cookieStore.set(DEVICE_AUTH_COOKIE, "", clear);
  cookieStore.set(DEVICE_TOKEN_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_ID_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_NAME_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, "", clear);
  cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", clear);
  cookieStore.set(ADMIN_COOKIE, "", clear);

  return NextResponse.json({ ok: true });
}
