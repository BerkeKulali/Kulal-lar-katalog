/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Salesperson` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Salesperson" ADD COLUMN "password" TEXT;
ALTER TABLE "Salesperson" ADD COLUMN "passwordChangedAt" DATETIME;
ALTER TABLE "Salesperson" ADD COLUMN "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Salesperson_username_key" ON "Salesperson"("username");
