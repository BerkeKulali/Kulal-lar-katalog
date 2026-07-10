-- Ürün varyantlarına yüzeyden bağımsız ek özellikler (3D, REC).
ALTER TABLE "ProductVariant" ADD COLUMN "feature3D" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "featureRec" INTEGER NOT NULL DEFAULT 0;

-- Eski yanlış yüzey kodlarını düzelt (varsa).
UPDATE "ProductVariant" SET "feature3D" = 1, "surface" = 'MAT' WHERE "surface" = 'THREE_D';
UPDATE "ProductVariant" SET "featureRec" = 1, "surface" = 'MAT' WHERE "surface" = 'REC';
