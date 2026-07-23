import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";
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
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  if (!deviceToken) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Aktör bilgisi (kim tıkladı) — event kaydı için.
  const rawActorType = cookieStore.get(DEVICE_ACTOR_TYPE_COOKIE)?.value ?? "";
  const actorType =
    rawActorType === "dealer"
      ? "dealer"
      : rawActorType.startsWith("salesperson")
        ? "salesperson"
        : "unknown";
  const salespersonId =
    cookieStore.get(SALESPERSON_ID_COOKIE)?.value || null;
  const actorName =
    cookieStore.get(DEVICE_ACTOR_NAME_COOKIE)?.value ||
    cookieStore.get(SALESPERSON_NAME_COOKIE)?.value ||
    null;

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

  // Cihaz kimliği (event'e yazmak için) — tek sorgu.
  const device = await prisma.device.findUnique({
    where: { token: deviceToken },
    select: { id: true },
  });

  const now = new Date();
  const eventRows: {
    familyId: string;
    deviceId: string | null;
    salespersonId: string | null;
    actorType: string;
    actorName: string | null;
    count: number;
    createdAt: Date;
  }[] = [];

  let recorded = 0;
  for (const { id } of existing) {
    const inc = counts.get(id);
    if (!inc) continue;
    try {
      // Hızlı sıralama için toplam sayaç.
      await prisma.familyClickStat.upsert({
        where: { familyId: id },
        create: { familyId: id, count: inc },
        update: { count: { increment: inc } },
      });
      recorded += 1;
      // Kim/ne zaman kırılımı için olay satırı.
      eventRows.push({
        familyId: id,
        deviceId: device?.id ?? null,
        salespersonId,
        actorType,
        actorName,
        count: inc,
        createdAt: now,
      });
    } catch {
      // tek bir ailenin yazımı başarısız olsa da diğerlerini bloklama
    }
  }

  if (eventRows.length > 0) {
    try {
      await prisma.familyClickEvent.createMany({ data: eventRows });
    } catch {
      // event kaydı başarısız olsa da sayaç güncellenmiş olur; sessiz geç
    }
  }

  return NextResponse.json({ ok: true, recorded });
}
