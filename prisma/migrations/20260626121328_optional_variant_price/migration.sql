-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "code" TEXT,
    "price" INTEGER,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "imageUpdatedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductVariant" ("code", "createdAt", "familyId", "id", "imagePublicId", "imageUpdatedAt", "imageUrl", "isActive", "price", "quality", "size", "surface", "updatedAt") SELECT "code", "createdAt", "familyId", "id", "imagePublicId", "imageUpdatedAt", "imageUrl", "isActive", "price", "quality", "size", "surface", "updatedAt" FROM "ProductVariant";
DROP TABLE "ProductVariant";
ALTER TABLE "new_ProductVariant" RENAME TO "ProductVariant";
CREATE INDEX "ProductVariant_familyId_size_idx" ON "ProductVariant"("familyId", "size");
CREATE UNIQUE INDEX "ProductVariant_familyId_size_surface_quality_key" ON "ProductVariant"("familyId", "size", "surface", "quality");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
