-- Benzer ürün ilişkisi (aile↔aile). Simetrik: her çift iki yönlü satır olarak
-- tutulur (A→B ve B→A), okuma tek kolondan yapılır.

-- CreateTable
CREATE TABLE "SimilarFamily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "similarFamilyId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimilarFamily_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimilarFamily_similarFamilyId_fkey" FOREIGN KEY ("similarFamilyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SimilarFamily_familyId_similarFamilyId_key" ON "SimilarFamily"("familyId", "similarFamilyId");
CREATE INDEX "SimilarFamily_familyId_idx" ON "SimilarFamily"("familyId");
CREATE INDEX "SimilarFamily_similarFamilyId_idx" ON "SimilarFamily"("similarFamilyId");
