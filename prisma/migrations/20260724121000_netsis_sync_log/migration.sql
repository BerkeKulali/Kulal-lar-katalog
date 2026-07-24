-- NetsisSyncLog: her stok senkronizasyonunun (manuel/ajan) kaydı.
CREATE TABLE "NetsisSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "fileName" TEXT,
    "totalCodes" INTEGER NOT NULL DEFAULT 0,
    "matchedCodes" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "variantsUpdated" INTEGER NOT NULL DEFAULT 0,
    "lockedSkipped" INTEGER NOT NULL DEFAULT 0,
    "zeroBalance" INTEGER NOT NULL DEFAULT 0,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "unmatchedSample" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "NetsisSyncLog_createdAt_idx" ON "NetsisSyncLog"("createdAt");
CREATE INDEX "NetsisSyncLog_source_createdAt_idx" ON "NetsisSyncLog"("source", "createdAt");
