-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "visibleToDealers" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePublicId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignImage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductFilterPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brandIds" TEXT NOT NULL DEFAULT '[]',
    "materialType" TEXT,
    "quality" TEXT,
    "basis" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "thresholdM2" REAL NOT NULL,
    "createdByAdminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "salespersonId" TEXT,
    "dealerName" TEXT NOT NULL,
    "notes" TEXT,
    "correctionNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "approvedByAdminId" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("approvedAt", "approvedByAdminId", "correctionNote", "createdAt", "dealerName", "id", "notes", "orderNumber", "salespersonId", "status", "updatedAt") SELECT "approvedAt", "approvedByAdminId", "correctionNote", "createdAt", "dealerName", "id", "notes", "orderNumber", "salespersonId", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE TABLE "new_Salesperson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showStock" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateIndex
CREATE INDEX "CampaignImage_campaignId_idx" ON "CampaignImage"("campaignId");
