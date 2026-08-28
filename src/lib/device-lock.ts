import { prisma } from "@/lib/prisma";

export const SALESPERSON_TABLET_LOCKED =
  "Bu plasiyer başka bir tablette kayıtlı. Yeni giriş için admin panelinden tablet kilidi kaldırılmalı.";

export const DEVICE_NOT_AUTHORIZED =
  "Bu tablet artık yetkili değil. Admin panelinden tablet kilidi kaldırılıp yeniden kurulum yapılmalı.";

export async function registerTabletForSalesperson(salespersonId: string) {
  return prisma.$transaction(async (tx) => {
    const salesperson = await tx.salesperson.findUnique({
      where: { id: salespersonId },
      select: { id: true, name: true, isActive: true, lockedDeviceId: true },
    });

    if (!salesperson) {
      throw new Error("Plasiyer bulunamadı");
    }

    if (!salesperson.isActive) {
      throw new Error("Plasiyer pasif durumda");
    }

    if (salesperson.lockedDeviceId) {
      throw new Error(SALESPERSON_TABLET_LOCKED);
    }

    const device = await tx.device.create({
      data: {
        salespersonId,
        label: `Tablet - ${salesperson.name}`,
      },
    });

    const updated = await tx.salesperson.updateMany({
      where: { id: salespersonId, lockedDeviceId: null },
      data: { lockedDeviceId: device.id },
    });

    if (updated.count !== 1) {
      throw new Error(SALESPERSON_TABLET_LOCKED);
    }

    return { device, salesperson };
  });
}

export type AuthorizedDevice = {
  id: string;
  salespersonId: string | null;
  dealerId: string | null;
};

/**
 * Token geçerli ve cihaz hâlâ yetkiliyse cihaz kaydını döner, aksi halde null.
 * Yetki kuralları:
 * - Plasiyerin tablet kilidi varsa yalnızca kilitli cihaz geçerlidir.
 * - Herhangi bir plasiyer cihazı için bağlı Salesperson.isActive true olmalı
 *   (kullanıcı adı/şifreli çoklu cihaz modunda da geçerli - admin pasife
 *   çekince o plasiyerin tüm cihazları anında yetkisiz sayılır).
 * - Kullanıcı adı/şifre ile giriş yapmış bayi cihazı (dealerId dolu) için,
 *   bağlı Dealer hesabı hâlâ onaylı (APPROVED) ve aktif olmalı — admin bir
 *   bayiyi reddedip/devre dışı bırakırsa o bayinin tüm mevcut cihaz oturumları
 *   (DEVICE_AUTH_COOKIE önbelleği kadar gecikmeyle) burada geçersiz sayılır.
 */
export async function getAuthorizedDevice(
  deviceToken: string
): Promise<AuthorizedDevice | null> {
  const device = await prisma.device.findUnique({
    where: { token: deviceToken },
    select: {
      id: true,
      salespersonId: true,
      dealerId: true,
      salesperson: {
        select: { lockedDeviceId: true, isActive: true },
      },
      dealer: {
        select: { status: true, isActive: true },
      },
    },
  });

  if (!device) return null;

  const lockId = device.salesperson?.lockedDeviceId;
  if (lockId && lockId !== device.id) return null;

  // Dealer dalıyla simetri: bir plasiyer pasife çekilirse (isActive=false),
  // kullanıcı adı/şifreyle çoklu cihaz modunda olsun tek-cihaz-kilitli eski
  // modda olsun, o plasiyerin TÜM cihazları anında yetkisiz sayılır.
  if (device.salespersonId) {
    if (!device.salesperson || device.salesperson.isActive === false) {
      return null;
    }
  }

  if (device.dealerId) {
    if (!device.dealer || device.dealer.status !== "APPROVED" || !device.dealer.isActive) {
      return null;
    }
  }

  return { id: device.id, salespersonId: device.salespersonId, dealerId: device.dealerId };
}

export async function isDeviceAuthorized(deviceToken: string): Promise<boolean> {
  return (await getAuthorizedDevice(deviceToken)) !== null;
}

export async function unlockSalespersonTablet(salespersonId: string) {
  await prisma.$transaction([
    prisma.salesperson.update({
      where: { id: salespersonId },
      data: { lockedDeviceId: null },
    }),
    prisma.device.deleteMany({
      where: { salespersonId },
    }),
  ]);
}

/** Plasiyer başına yalnızca kilitli tablet kalsın; eski kurulum kayıtlarını siler. */
export async function pruneDuplicateDevices(): Promise<{ removed: number }> {
  const salespeople = await prisma.salesperson.findMany({
    // Kullanıcı adı/şifreli (çoklu cihaz modundaki) plasiyerler bu
    // temizlikten muaf - amaçları zaten birden fazla cihaz bağlı kalması
    // (bkz. salesperson-account.ts / createDeviceForSalesperson).
    where: { username: null },
    select: { id: true, lockedDeviceId: true },
  });

  let removed = 0;

  for (const sp of salespeople) {
    if (sp.lockedDeviceId) {
      const result = await prisma.device.deleteMany({
        where: {
          salespersonId: sp.id,
          id: { not: sp.lockedDeviceId },
        },
      });
      removed += result.count;
      continue;
    }

    const devices = await prisma.device.findMany({
      where: { salespersonId: sp.id },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true },
    });

    if (devices.length <= 1) continue;

    const keepId = devices[0]!.id;
    await prisma.$transaction([
      prisma.salesperson.update({
        where: { id: sp.id },
        data: { lockedDeviceId: keepId },
      }),
      prisma.device.deleteMany({
        where: {
          salespersonId: sp.id,
          id: { not: keepId },
        },
      }),
    ]);
    removed += devices.length - 1;
  }

  return { removed };
}
