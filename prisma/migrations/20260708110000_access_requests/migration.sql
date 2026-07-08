-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "salespersonId" TEXT,
    "dealerName" TEXT,
    "requestToken" TEXT NOT NULL,
    "requestLabel" TEXT NOT NULL,
    "deviceId" TEXT,
    "approvedByAdminId" TEXT,
    "rejectionReason" TEXT,
    "notifiedAt" DATETIME,
    "approvedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccessRequest_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AccessRequest_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AccessRequest_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_requestToken_key" ON "AccessRequest"("requestToken");

-- CreateIndex
CREATE INDEX "AccessRequest_status_createdAt_idx" ON "AccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_type_createdAt_idx" ON "AccessRequest"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRequest_salespersonId_status_idx" ON "AccessRequest"("salespersonId", "status");
