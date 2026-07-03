export type SyncVariantRow = {
  id: string;
  familyId: string;
  brandSlug: string;
  size: string;
  surface: string;
  quality: string;
  price: number | null;
  code: string | null;
  stockM2: number;
  imageUrl: string | null;
  imageUpdatedAt: string | null;
  updatedAt: string;
};

export type SyncFamilyRow = {
  id: string;
  brandSlug: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageUpdatedAt: string | null;
  updatedAt: string;
  isActive: boolean;
};

export type SyncPayload = {
  priceListVersion: string;
  imageCatalogVersion: string;
  serverTime: string;
  variants: SyncVariantRow[];
  families: SyncFamilyRow[];
  isDelta: boolean;
};

export const SYNC_INTERVAL_MS = 10 * 60 * 1000;
