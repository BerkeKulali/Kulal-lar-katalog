-- Benzersizlik kısıtını önce kaldır (birleştirme sırasında çakışmayı önler).
DROP INDEX IF EXISTS "ProductVariant_familyId_size_surface_quality_key";

-- MAT eşi olmayan REC/THREE_D satırlarını doğrudan dönüştür.
UPDATE "ProductVariant"
SET "featureRec" = 1, "surface" = 'MAT'
WHERE "surface" = 'REC'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductVariant" AS mat
    WHERE mat."familyId" = "ProductVariant"."familyId"
      AND mat."size" = "ProductVariant"."size"
      AND mat."quality" = "ProductVariant"."quality"
      AND mat."surface" = 'MAT'
  );

UPDATE "ProductVariant"
SET "feature3D" = 1, "surface" = 'MAT'
WHERE "surface" = 'THREE_D'
  AND NOT EXISTS (
    SELECT 1 FROM "ProductVariant" AS mat
    WHERE mat."familyId" = "ProductVariant"."familyId"
      AND mat."size" = "ProductVariant"."size"
      AND mat."quality" = "ProductVariant"."quality"
      AND mat."surface" = 'MAT'
  );

-- MAT eşi varsa özellik bayrağını oraya taşı.
UPDATE "ProductVariant"
SET "featureRec" = 1
WHERE "surface" = 'MAT'
  AND EXISTS (
    SELECT 1 FROM "ProductVariant" AS rec
    WHERE rec."familyId" = "ProductVariant"."familyId"
      AND rec."size" = "ProductVariant"."size"
      AND rec."quality" = "ProductVariant"."quality"
      AND rec."surface" = 'REC'
  );

UPDATE "ProductVariant"
SET "feature3D" = 1
WHERE "surface" = 'MAT'
  AND EXISTS (
    SELECT 1 FROM "ProductVariant" AS three
    WHERE three."familyId" = "ProductVariant"."familyId"
      AND three."size" = "ProductVariant"."size"
      AND three."quality" = "ProductVariant"."quality"
      AND three."surface" = 'THREE_D'
  );

DELETE FROM "ProductVariant" WHERE "surface" IN ('REC', 'THREE_D');

CREATE UNIQUE INDEX "ProductVariant_familyId_size_surface_quality_feature3D_featureRec_key" ON "ProductVariant"("familyId", "size", "surface", "quality", "feature3D", "featureRec");
