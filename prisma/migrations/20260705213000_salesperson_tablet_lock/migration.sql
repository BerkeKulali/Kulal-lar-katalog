-- AlterTable
ALTER TABLE "Salesperson" ADD COLUMN "lockedDeviceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Salesperson_lockedDeviceId_key" ON "Salesperson"("lockedDeviceId");

-- Backfill: mevcut plasiyerleri en son görülen tablete kilitle
UPDATE "Salesperson"
SET "lockedDeviceId" = (
  SELECT "d"."id"
  FROM "Device" AS "d"
  WHERE "d"."salespersonId" = "Salesperson"."id"
  ORDER BY "d"."lastSeenAt" DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "Device" AS "d" WHERE "d"."salespersonId" = "Salesperson"."id"
);
