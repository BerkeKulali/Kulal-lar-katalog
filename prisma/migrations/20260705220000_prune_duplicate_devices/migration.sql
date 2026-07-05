-- Kilitli plasiyerlerde yalnızca aktif tablet kalsın
DELETE FROM "Device"
WHERE "id" IN (
  SELECT "d"."id"
  FROM "Device" AS "d"
  INNER JOIN "Salesperson" AS "s" ON "s"."id" = "d"."salespersonId"
  WHERE "s"."lockedDeviceId" IS NOT NULL AND "d"."id" != "s"."lockedDeviceId"
);
