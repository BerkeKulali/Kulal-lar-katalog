-- Marka görünürlüğü koda gömülü sabitlerden (lib/catalog.ts HIDDEN_BRAND_SLUGS,
-- DEALER_HIDDEN_BRAND_SLUGS ve proxy.ts'teki yönlendirme) veritabanına taşınıyor.

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Brand" ADD COLUMN "visibleToDealers" BOOLEAN NOT NULL DEFAULT true;

-- Mevcut davranışı birebir korumak için sabitlerdeki değerler aktarılır:
--   HIDDEN_BRAND_SLUGS        = ["kale"]           -> herkesten gizli
--   DEALER_HIDDEN_BRAND_SLUGS = ["bien", "qua"]    -> bayilere kapalı
UPDATE "Brand" SET "isVisible" = false WHERE "slug" IN ('kale');
UPDATE "Brand" SET "visibleToDealers" = false WHERE "slug" IN ('bien', 'qua');
