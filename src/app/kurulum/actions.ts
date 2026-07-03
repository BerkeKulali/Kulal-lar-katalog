"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";

export async function registerTabletAction(formData: FormData) {
  const salespersonId = formData.get("salespersonId");

  if (typeof salespersonId !== "string" || !salespersonId) {
    redirect("/kurulum?error=" + encodeURIComponent("Plasiyer seçin"));
  }

  try {
    const salesperson = await prisma.salesperson.findUnique({
      where: { id: salespersonId },
    });

    if (!salesperson) {
      redirect(
        "/kurulum?error=" + encodeURIComponent("Plasiyer bulunamadı")
      );
    }

    const device = await prisma.device.create({
      data: {
        salespersonId,
        label: `Tablet - ${salesperson.name}`,
      },
    });

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
