import { featureBadges, normalizeProductFeatures } from "@/lib/product-features";
import { qualityLabel } from "@/lib/utils";

export const MAX_ORDER_LINES = 200;
export const MAX_QUANTITY_M2 = 100_000;
export const MAX_DEALER_NAME_LENGTH = 120;
export const MAX_NOTES_LENGTH = 2000;

/**
 * Route'un HTTP durum koduna çevirebileceği, kullanıcıya gösterilebilir hata.
 * (Parametre özelliği yerine düz atama kullanılıyor; Node'un tip sıyırma modu
 * `readonly status: number` biçimini desteklemiyor.)
 */
export class OrderValidationError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "OrderValidationError";
    this.status = status;
  }
}

export type OrderRequestItem = {
  variantId: string;
  quantityM2: number;
};

/**
 * İstemciden gelen sipariş satırlarını doğrular.
 * Fiyat ve ürün etiketi İSTEMCİDEN ALINMAZ; sunucuda DB'den üretilir.
 */
export function parseOrderItems(raw: unknown): OrderRequestItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new OrderValidationError("Ürün listesi boş");
  }
  if (raw.length > MAX_ORDER_LINES) {
    throw new OrderValidationError(
      `Bir siparişte en fazla ${MAX_ORDER_LINES} satır olabilir`
    );
  }

  const byVariant = new Map<string, number>();

  for (const entry of raw) {
    const variantId =
      typeof (entry as { variantId?: unknown })?.variantId === "string"
        ? (entry as { variantId: string }).variantId.trim()
        : "";
    if (!variantId) {
      throw new OrderValidationError("Geçersiz ürün kaydı");
    }

    const quantityM2 = Number((entry as { quantityM2?: unknown })?.quantityM2);
    if (!Number.isFinite(quantityM2) || quantityM2 <= 0) {
      throw new OrderValidationError("Miktar sıfırdan büyük olmalı");
    }
    if (quantityM2 > MAX_QUANTITY_M2) {
      throw new OrderValidationError(
        `Miktar en fazla ${MAX_QUANTITY_M2} m² olabilir`
      );
    }

    // Aynı varyant birden fazla kez gönderilirse tek satırda toplanır.
    byVariant.set(variantId, (byVariant.get(variantId) ?? 0) + quantityM2);
  }

  return [...byVariant].map(([variantId, quantityM2]) => ({
    variantId,
    quantityM2: Math.round(quantityM2 * 100) / 100,
  }));
}

export function parseDealerName(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (value.length < 2) {
    throw new OrderValidationError("Bayi adı gerekli");
  }
  if (value.length > MAX_DEALER_NAME_LENGTH) {
    throw new OrderValidationError("Bayi adı çok uzun");
  }
  return value;
}

export function parseNotes(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  return value.slice(0, MAX_NOTES_LENGTH);
}

/** Sipariş satırı etiketi — istemciden gelen metne güvenilmez. */
export function buildOrderLineLabel(variant: {
  size: string;
  surface: string;
  quality: string;
  feature3D: boolean;
  featureRec: boolean;
  family: { name: string };
}): string {
  const badges = featureBadges(normalizeProductFeatures(variant));
  const suffix = badges.length ? ` ${badges.join(" ")}` : "";
  return `${variant.family.name} ${variant.size.toUpperCase()} ${variant.surface} ${qualityLabel(
    variant.quality as "FIRST" | "END"
  )}${suffix}`;
}
