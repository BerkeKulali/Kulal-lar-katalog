-- AlterTable
ALTER TABLE "Order" ADD COLUMN "correctionNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "approvedByAdminId" TEXT;
ALTER TABLE "Order" ADD COLUMN "approvedAt" DATETIME;

-- CreateTable
CREATE TABLE "OrderAdminLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderAdminLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderAdminLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrderAdminLog_orderId_idx" ON "OrderAdminLog"("orderId");
