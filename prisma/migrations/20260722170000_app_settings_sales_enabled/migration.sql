-- AppSettings.salesEnabled: katalogdan satış (sepet/sipariş) açık mı?
-- Varsayılan açık; admin panelinden kapatılabilir.

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN "salesEnabled" BOOLEAN NOT NULL DEFAULT true;
