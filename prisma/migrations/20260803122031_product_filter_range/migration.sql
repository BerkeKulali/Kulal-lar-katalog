/*
  Warnings:

  - You are about to drop the column `direction` on the `ProductFilterPreset` table. All the data in the column will be lost.
  - You are about to drop the column `thresholdM2` on the `ProductFilterPreset` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductFilterPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brandIds" TEXT NOT NULL DEFAULT '[]',
    "materialType" TEXT,
    "quality" TEXT,
    "basis" TEXT NOT NULL,
    "minM2" REAL,
    "maxM2" REAL,
    "createdByAdminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProductFilterPreset" ("basis", "brandIds", "createdAt", "createdByAdminId", "id", "materialType", "name", "quality", "updatedAt") SELECT "basis", "brandIds", "createdAt", "createdByAdminId", "id", "materialType", "name", "quality", "updatedAt" FROM "ProductFilterPreset";
DROP TABLE "ProductFilterPreset";
ALTER TABLE "new_ProductFilterPreset" RENAME TO "ProductFilterPreset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
