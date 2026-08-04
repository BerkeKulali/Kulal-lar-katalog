import { NextResponse } from "next/server";
import { createDealerAccount } from "@/lib/dealer-account";
import { checkRateLimitShared, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = await checkRateLimitShared(`dealer-signup:${clientIp(request)}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dealer = await createDealerAccount({
      name: body.name,
      username: body.username,
      password: body.password,
    });
    return NextResponse.json({ ok: true, status: dealer.status, username: dealer.username });
  } catch (err) {
    console.error("POST /api/dealer/signup failed:", err);
    const message = err instanceof Error ? err.message : "Kayıt oluşturulamadı";
    const status = message.includes("zaten kullanılıyor") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
