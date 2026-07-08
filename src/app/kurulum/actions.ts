"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_AUTH_MAX_AGE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";
import { registerTabletForSalesperson } from "@/lib/device-lock";

export async function registerTabletAction(formData: FormData) {
  const salespersonId = formData.get("salespersonId");

  if (typeof salespersonId !== "string" || !salespersonId) {
    redirect("/kurulum?error=" + encodeURIComponent("Plasiyer seçin"));
  }

  try {
    const { device, salesperson } =
      await registerTabletForSalesperson(salespersonId);

    const cookieStore = await cookies();
    const opts = deviceCookieOptions();

    cookieStore.set(DEVICE_TOKEN_COOKIE, device.token, opts);
    cookieStore.set(DEVICE_AUTH_COOKIE, device.token, {
      path: "/",
      maxAge: DEVICE_AUTH_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    });
    cookieStore.set(SALESPERSON_ID_COOKIE, salesperson.id, opts);
    cookieStore.set(SALESPERSON_NAME_COOKIE, salesperson.name, opts);
    cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "salesperson", opts);
    cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, salesperson.name, opts);
    cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  } catch (err) {
    console.error("registerTabletAction failed:", err);
    const message =
      err instanceof Error ? err.message : "Tablet kaydı oluşturulamadı";
    redirect("/kurulum?error=" + encodeURIComponent(message));
  }

  redirect("/");
}
