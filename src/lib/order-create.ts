import { prisma } from "@/lib/prisma";
import { getAuthorizedDevice } from "@/lib/device-lock";
import {
  buildOrderLineLabel,
  OrderValidationError,
  parseDealerName,
  parseNotes,
  parseOrderItems,
} from "@/lib/order-validation";
import { generateOrderNumber } from "@/lib/utils";

export * from "@/lib/order-validation";

const ORDER_NUMBER_ATTEMPTS = 5;

export type CreateOrderInput = {
  /** Yalnızca cookie'den okunur; istek gövdesinden kabul edilmez. */
  deviceToken: string | undefined;
  dealerName: unknown;
  notes: unknown;
  items: unknown;
};

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export async function createOrder(input: CreateOrderInput) {
  // 1) Cihaz doğrulaması — token yalnızca cookie'den gelir, gövdeden değil.
  if (!input.deviceToken) {
    throw new OrderValidationError("Cihaz kaydı bulunamadı", 401);
  }
  const device = await getAuthorizedDevice(input.deviceToken);
  if (!device) {
    throw new OrderValidationError("Bu cihaz sipariş gönderemez", 403);
  }

  // 2) Girdi doğrulaması
  const dealerName = parseDealerName(input.dealerName);
  const notes = parseNotes(input.notes);
  const items = parseOrderItems(input.items);

  // 3) Fiyat ve etiket sunucuda üretilir
  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: items.map((i) => i.variantId) },
      isActive: true,
      family: { isActive: true },
    },
    select: {
      id: true,
      size: true,
      surface: true,
      quality: true,
      feature3D: true,
      featureRec: true,
      price: true,
      family: { select: { name: true } },
    },
  });

  const variantById = new Map(variants.map((v) => [v.id, v]));

  const lines = items.map((item) => {
    const variant = variantById.get(item.variantId);
    if (!variant) {
      throw new OrderValidationError(
        "Siparişteki ürünlerden biri artık geçerli değil. Listeyi yenileyin."
      );
    }
    if (variant.price == null) {
      throw new OrderValidationError(
        `${variant.family.name} için fiyat tanımlı değil; sipariş oluşturulamaz.`
      );
    }
    return {
      variantId: variant.id,
      quantityM2: item.quantityM2,
      unitPriceSnapshot: variant.price,
      productLabel: buildOrderLineLabel(variant),
    };
  });

  // 4) Plasiyer atfı cihaz kaydından gelir; bayi cihazlarında null kalır.
  const salespersonId = device.salespersonId;

  for (let attempt = 1; attempt <= ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          dealerName,
          notes,
          salespersonId,
          lines: { create: lines },
        },
        select: { id: true, orderNumber: true },
      });
    } catch (err) {
      if (isUniqueConstraintError(err) && attempt < ORDER_NUMBER_ATTEMPTS) {
        continue;
      }
      throw err;
    }
  }

  throw new OrderValidationError("Sipariş numarası üretilemedi", 500);
}
