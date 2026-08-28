import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { groupDeviceActivity } from "@/lib/login-activity";
import { istanbulStartOfDay } from "@/lib/site-visits";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ISTANBUL_TZ = "Europe/Istanbul";
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDayStart(raw: string | null): Date {
  if (!raw || !DAY_PATTERN.test(raw)) return istanbulStartOfDay();
  const parsed = new Date(`${raw}T12:00:00+03:00`);
  if (Number.isNaN(parsed.getTime())) return istanbulStartOfDay();
  return istanbulStartOfDay(parsed);
}

/**
 * Belirli bir günde (varsayılan: bugün, İstanbul saatiyle) kataloğu
 * kullanmış - cihaz "son görülme" zamanı o gün içinde olan - bayi ve
 * plasiyerleri listeler. "Giriş" burada bir oturum-açma olayı değil, o gün
 * en az bir kez aktif olma anlamına gelir (bkz. touchDevice /
 * device-activity.ts). Gruplama login-activity.ts'te (saf, test edilebilir).
 */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const dayStart = parseDayStart(searchParams.get("date"));
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // NOT: dealerId/salespersonId'ye göre filtrelenmiyor - kullanıcı adı/şifre
  // sisteminden ÖNCE oluşturulmuş "eski, tek-seferlik" bayi cihazlarının
  // (bkz. /api/admin/dealers'daki "legacyDevices") ikisi de boş ama bir
  // label'ı var; bunları da göstermek için groupDeviceActivity'ye bırakılıyor
  // (bkz. login-activity.ts - gerçekten isimsiz olanları o eliyor).
  const devices = await prisma.device.findMany({
    where: {
      lastSeenAt: { gte: dayStart, lt: dayEnd },
    },
    select: {
      id: true,
      lastSeenAt: true,
      label: true,
      dealer: { select: { id: true, name: true, isActive: true } },
      salesperson: { select: { id: true, name: true, isActive: true } },
    },
  });

  const items = groupDeviceActivity(devices).map((row) => ({
    ...row,
    lastSeenAt: row.lastSeenAt.toISOString(),
  }));

  return NextResponse.json({
    items,
    date: dayStart.toLocaleDateString("en-CA", { timeZone: ISTANBUL_TZ }),
  });
}
