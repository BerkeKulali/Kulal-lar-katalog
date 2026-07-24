-- ProductVariant: manuel stok kilidi (true ise Netsis otomasyonu atlar).
ALTER TABLE "ProductVariant" ADD COLUMN "stockLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariant" ADD COLUMN "stockLockedAt" DATETIME;
