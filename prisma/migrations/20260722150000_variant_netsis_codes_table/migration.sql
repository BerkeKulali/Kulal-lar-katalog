-- Netsis kodu artık varyant başına ÇOK olabilir (bir üründe birden fazla Netsis
-- stok kodu). Tek kolonlu netsisStockCode alanı, kod başına bir satır tutan
-- VariantNetsisCode tablosuyla değiştiriliyor. Kod global benzersiz kalır.

-- CreateTable
CREATE TABLE "VariantNetsisCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariantNetsisCode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantNetsisCode_code_key" ON "VariantNetsisCode"("code");
CREATE INDEX "VariantNetsisCode_variantId_idx" ON "VariantNetsisCode"("variantId");

-- Var olan tek-kod atamalarını yeni tabloya taşı (henüz veri yoksa no-op).
INSERT INTO "VariantNetsisCode" ("id", "code", "variantId")
SELECT lower(hex(randomblob(12))), "netsisStockCode", "id"
FROM "ProductVariant"
WHERE "netsisStockCode" IS NOT NULL AND TRIM("netsisStockCode") <> '';

-- Eski tek-kod alanını kaldır.
DROP INDEX IF EXISTS "ProductVariant_netsisStockCode_key";
ALTER TABLE "ProductVariant" DROP COLUMN "netsisStockCode";
