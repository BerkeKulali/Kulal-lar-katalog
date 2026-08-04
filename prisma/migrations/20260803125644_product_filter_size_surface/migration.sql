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
    "sizes" TEXT NOT NULL DEFAULT '[]',
    "surfaces" TEXT NOT NULL DEFAULT '[]',
    "createdByAdminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProductFilterPreset" ("basis", "brandIds", "createdAt", "createdByAdminId", "id", "materialType", "maxM2", "minM2", "name", "quality", "updatedAt") SELECT "basis", "brandIds", "createdAt", "createdByAdminId", "id", "materialType", "maxM2", "minM2", "name", "quality", "updatedAt" FROM "ProductFilterPreset";
DROP TABLE "ProductFilterPreset";
ALTER TABLE "new_ProductFilterPreset" RENAME TO "ProductFilterPreset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
