-- ProductFamily.color + materialType: renk ve görünüm/tip (mermer, ahşap,
-- beton...). Önceden tanımlı kimlikler (product-attributes.ts). Filtreleme için.

-- AlterTable
ALTER TABLE "ProductFamily" ADD COLUMN "color" TEXT;
ALTER TABLE "ProductFamily" ADD COLUMN "materialType" TEXT;
