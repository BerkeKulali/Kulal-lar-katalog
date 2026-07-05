"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
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
    cookieStore.set(SALESPERSON_ID_COOKIE, salesperson.id, opts);
    cookieStore.set(SALESPERSON_NAME_COOKIE, salesperson.name, opts);
  } catch (err) {
    console.error("registerTabletAction failed:", err);
    const message =
      err instanceof Error ? err.message : "Tablet kaydı oluşturulamadı";
    redirect("/kurulum?error=" + encodeURIComponent(message));
  }

  redirect("/");
}
