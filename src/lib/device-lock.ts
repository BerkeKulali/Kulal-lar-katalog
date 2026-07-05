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

export async function isDeviceAuthorized(deviceToken: string): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { token: deviceToken },
    select: {
      id: true,
      salesperson: {
        select: { lockedDeviceId: true },
      },
    },
  });

  if (!device) return false;

  const lockId = device.salesperson?.lockedDeviceId;
  if (!lockId) return true;

  return lockId === device.id;
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
