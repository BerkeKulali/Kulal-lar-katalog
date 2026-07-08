import { prisma } from "@/lib/prisma";
import { SALESPERSON_TABLET_LOCKED } from "@/lib/device-lock";

export async function createDealerDeviceAccess(dealerName: string) {
  const normalizedName = dealerName.trim().replace(/\s+/g, " ");
  if (normalizedName.length < 2) {
    throw new Error("Geçerli bir bayi adı girin");
  }

  return prisma.$transaction(async (tx) => {
    const device = await tx.device.create({
      data: {
        label: `Bayi - ${normalizedName}`,
      },
    });

    const request = await tx.accessRequest.create({
      data: {
        type: "DEALER",
        status: "APPROVED",
        dealerName: normalizedName,
        requestToken: crypto.randomUUID(),
        requestLabel: `Bayi - ${normalizedName}`,
        deviceId: device.id,
        approvedAt: new Date(),
      },
    });

    return { device, request, dealerName: normalizedName };
  });
}

export async function createSalespersonAccessRequest(salespersonId: string) {
  const salesperson = await prisma.salesperson.findUnique({
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

  const requestToken = crypto.randomUUID();
  const request = await prisma.accessRequest.create({
    data: {
      type: "SALESPERSON",
      status: "PENDING",
      salespersonId: salesperson.id,
      requestToken,
      requestLabel: `Plasiyer - ${salesperson.name}`,
    },
    select: {
      id: true,
      requestToken: true,
      status: true,
      salesperson: { select: { name: true } },
    },
  });

  return {
    requestId: request.id,
    requestToken: request.requestToken,
    status: request.status,
    salespersonName: request.salesperson?.name ?? "",
  };
}

export async function getAccessRequestByToken(token: string) {
  return prisma.accessRequest.findUnique({
    where: { requestToken: token },
    include: {
      salesperson: { select: { id: true, name: true } },
      device: { select: { id: true, token: true } },
    },
  });
}

export async function approveSalespersonAccessRequest(
  requestId: string,
  adminId: string
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        salesperson: {
          select: { id: true, name: true, isActive: true, lockedDeviceId: true },
        },
      },
    });

    if (!request || request.type !== "SALESPERSON") {
      throw new Error("Talep bulunamadı");
    }
    if (request.status !== "PENDING") {
      throw new Error("Bu talep zaten işlenmiş");
    }
    if (!request.salesperson || !request.salesperson.isActive) {
      throw new Error("Plasiyer aktif değil");
    }
    if (request.salesperson.lockedDeviceId) {
      throw new Error(SALESPERSON_TABLET_LOCKED);
    }

    await tx.accessRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approvedByAdminId: adminId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
  });
}

export async function rejectSalespersonAccessRequest(
  requestId: string,
  adminId: string,
  reason?: string
) {
  const rejectionReason = reason?.trim() ? reason.trim().slice(0, 200) : null;
  const request = await prisma.accessRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, type: true },
  });

  if (!request || request.type !== "SALESPERSON") {
    throw new Error("Talep bulunamadı");
  }
  if (request.status !== "PENDING") {
    throw new Error("Bu talep zaten işlenmiş");
  }

  await prisma.accessRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      approvedByAdminId: adminId,
      rejectionReason,
      approvedAt: null,
    },
  });
}

export async function finalizeApprovedSalespersonRequest(requestToken: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.accessRequest.findUnique({
      where: { requestToken },
      include: {
        salesperson: {
          select: { id: true, name: true, isActive: true, lockedDeviceId: true },
        },
      },
    });

    if (!request || request.type !== "SALESPERSON") {
      throw new Error("Talep bulunamadı");
    }
    if (request.status !== "APPROVED") {
      throw new Error("Talep henüz onaylanmadı");
    }
    if (request.completedAt) {
      throw new Error("Talep zaten tamamlanmış");
    }
    if (!request.salesperson) {
      throw new Error("Plasiyer kaydı bulunamadı");
    }
    if (!request.salesperson.isActive) {
      throw new Error("Plasiyer pasif durumda");
    }
    if (request.salesperson.lockedDeviceId) {
      throw new Error(SALESPERSON_TABLET_LOCKED);
    }

    const device = await tx.device.create({
      data: {
        salespersonId: request.salesperson.id,
        label: `Tablet - ${request.salesperson.name}`,
      },
    });

    const updated = await tx.salesperson.updateMany({
      where: { id: request.salesperson.id, lockedDeviceId: null },
      data: { lockedDeviceId: device.id },
    });

    if (updated.count !== 1) {
      throw new Error(SALESPERSON_TABLET_LOCKED);
    }

    await tx.accessRequest.update({
      where: { id: request.id },
      data: {
        completedAt: new Date(),
        deviceId: device.id,
      },
    });

    return {
      device,
      salesperson: request.salesperson,
    };
  });
}
