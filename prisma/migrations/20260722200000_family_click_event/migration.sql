-- FamilyClickEvent: olay düzeyinde tıklama kaydı (aile + bayi/plasiyer + tarih
-- + sayı). Bayi/plasiyer ve tarih bazlı raporlar bundan üretilir.

-- CreateTable
CREATE TABLE "FamilyClickEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "deviceId" TEXT,
    "salespersonId" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'unknown',
    "actorName" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyClickEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FamilyClickEvent_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FamilyClickEvent_familyId_createdAt_idx" ON "FamilyClickEvent"("familyId", "createdAt");
CREATE INDEX "FamilyClickEvent_salespersonId_createdAt_idx" ON "FamilyClickEvent"("salespersonId", "createdAt");
CREATE INDEX "FamilyClickEvent_createdAt_idx" ON "FamilyClickEvent"("createdAt");
