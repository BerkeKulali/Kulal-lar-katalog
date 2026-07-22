-- Device.showStock: bayi cihazları için stok görünürlüğü. Varsayılan kapalı
-- (yalnızca admin kararıyla, çok kısıtlı bayilere açılır). Plasiyer cihazlarında
-- kullanılmaz; onlar Salesperson.showStock'a bakar.

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "showStock" BOOLEAN NOT NULL DEFAULT false;
