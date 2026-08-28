-- AlterTable
ALTER TABLE "Salesperson" ADD COLUMN "username" TEXT;
ALTER TABLE "Salesperson" ADD COLUMN "password" TEXT;
ALTER TABLE "Salesperson" ADD COLUMN "passwordChangedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "Salesperson_username_key" ON "Salesperson"("username");
