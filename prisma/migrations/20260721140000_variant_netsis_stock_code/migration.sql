-- ProductVariant.netsisStockCode: Netsis stok kodu, stok importunda eşleşme
-- anahtarı. Nullable ve global benzersiz (SQLite'ta birden çok NULL'a izin verir,
-- yani kod atanmamış varyantlar benzersizlik kısıtını ihlal etmez).

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "netsisStockCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_netsisStockCode_key" ON "ProductVariant"("netsisStockCode");
