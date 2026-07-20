-- AdminUser.passwordChangedAt: şifre değiştiğinde eski oturum cookie'lerini
-- geçersizlemek için. SQLite'ta ALTER TABLE ADD COLUMN sabit olmayan default
-- (CURRENT_TIMESTAMP) kabul etmediğinden tablo yeniden oluşturuluyor.
-- Mevcut kayıtlar createdAt ile doldurulur.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "passwordChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'BRAND_MANAGER',
    "brandId" TEXT,
    "permissions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminUser_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminUser" ("brandId", "createdAt", "email", "id", "name", "password", "passwordChangedAt", "permissions", "role", "updatedAt") SELECT "brandId", "createdAt", "email", "id", "name", "password", "createdAt", "permissions", "role", "updatedAt" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
