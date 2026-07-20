import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { touchDevice } from "@/lib/device-activity";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 200;
const MAX_COUNT_PER_ITEM = 500;

type Incoming = { familyId?: unknown; count?: unknown };

/**
 * Bayilerin/plasiyerlerin ürün detayına tıklama sayılarını toplu (batch) alır.
 * İstemci tıklamaları biriktirir ve seyrek aralıklarla (sendBeacon) buraya yollar,
 * böylece her tıklama için ayrı istek atılmaz.
 */
export async function POST(request: Request) {
  // Yalnızca kayıtlı cihazlar sayılır; hem kötüye kullanımı önler hem de
  // analitiği gerçek bayi/plasiyer kullanımıyla sınırlar.
  const deviceToken = (await cookies()).get(DEVICE_TOKEN_COOKIE)?.value;
  if (!deviceToken) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const limit = checkRateLimit(`track-clicks:${clientIp(request)}`, {
    max: 120,
    windowMs: 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: true, throttled: true }, { status: 429 });
  }

  // Gerçek etkileşimde geldiği için "son görülme" için güvenilir bir sinyal.
  await touchDevice(deviceToken);

  const body = await request.json().catch(() => null);
  const rawItems: Incoming[] = Array.isArray(body?.items) ? body.items : [];

  const counts = new Map<string, number>();
  for (const item of rawItems.slice(0, MAX_ITEMS)) {
    const familyId = typeof item?.familyId === "string" ? item.familyId.trim() : "";
    const count = Number(item?.count);
    if (!familyId || !Number.isFinite(count) || count <= 0) continue;
    const clamped = Math.min(Math.floor(count), MAX_COUNT_PER_ITEM);
    counts.set(familyId, (counts.get(familyId) ?? 0) + clamped);
  }

  if (counts.size === 0) {
    return NextResponse.json({ ok: true, recorded: 0 });
  }

  // FK hatasını önlemek için yalnızca var olan ailelere yaz.
  const existing = await prisma.productFamily.findMany({
    where: { id: { in: [...counts.keys()] } },
    select: { id: true },
  });

  let recorded = 0;
  for (const { id } of existing) {
    const inc = counts.get(id);
    if (!inc) continue;
    try {
      await prisma.familyClickStat.upsert({
        where: { familyId: id },
        create: { familyId: id, count: inc },
        update: { count: { increment: inc } },
      });
      recorded += 1;
    } catch {
      // tek bir ailenin yazımı başarısız olsa da diğerlerini bloklama
    }
  }

  return NextResponse.json({ ok: true, recorded });
}
