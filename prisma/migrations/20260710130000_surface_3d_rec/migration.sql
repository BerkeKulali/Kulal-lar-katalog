-- BIEN / QUA yüzey kodları: 3D (THREE_D) ve REC (rektifiye). SQLite enum = TEXT.

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "feature3D" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariant" ADD COLUMN "featureRec" BOOLEAN NOT NULL DEFAULT false;
