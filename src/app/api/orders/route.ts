import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { touchDevice } from "@/lib/device-activity";
import { createOrder, OrderValidationError } from "@/lib/order-create";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Sipariş oluşturma. Admin tarafı listeleme için /api/admin/orders kullanılır.
 *
 * Güvenlik notları:
 * - Cihaz token'ı YALNIZCA cookie'den okunur (gövdeden kabul edilmez).
 * - Fiyat ve ürün etiketi sunucuda DB'den üretilir; istemci fiyatı yok sayılır.
 * - Plasiyer atfı cihaz kaydından gelir.
 */
export async function POST(request: Request) {
  const limit = checkRateLimit(`create-order:${clientIp(request)}`, {
    max: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla sipariş denemesi. Biraz sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const deviceToken = (await cookies()).get(DEVICE_TOKEN_COOKIE)?.value;

  try {
    const order = await createOrder({
      deviceToken,
      dealerName: (body as { dealerName?: unknown }).dealerName,
      notes: (body as { notes?: unknown }).notes,
      items: (body as { items?: unknown }).items,
    });

    await touchDevice(deviceToken, { force: true });

    return NextResponse.json({ id: order.id, orderNumber: order.orderNumber });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/orders failed:", err);
    return NextResponse.json(
      { error: "Sipariş oluşturulamadı" },
      { status: 500 }
    );
  }
}
