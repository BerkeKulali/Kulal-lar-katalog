-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "salespersonId" TEXT,
    "showStock" BOOLEAN NOT NULL DEFAULT false,
    "filterToolEnabled" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Device" ("id", "label", "lastSeenAt", "registeredAt", "salespersonId", "showStock", "token") SELECT "id", "label", "lastSeenAt", "registeredAt", "salespersonId", "showStock", "token" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_token_key" ON "Device"("token");
CREATE TABLE "new_Salesperson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showStock" BOOLEAN NOT NULL DEFAULT true,
    "filterToolEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockedDeviceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Salesperson_lockedDeviceId_fkey" FOREIGN KEY ("lockedDeviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Salesperson" ("createdAt", "id", "isActive", "lockedDeviceId", "name", "showStock", "updatedAt") SELECT "createdAt", "id", "isActive", "lockedDeviceId", "name", "showStock", "updatedAt" FROM "Salesperson";
DROP TABLE "Salesperson";
ALTER TABLE "new_Salesperson" RENAME TO "Salesperson";
CREATE UNIQUE INDEX "Salesperson_lockedDeviceId_key" ON "Salesperson"("lockedDeviceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
