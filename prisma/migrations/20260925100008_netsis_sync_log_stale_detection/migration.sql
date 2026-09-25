-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NetsisSyncLog" (
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
    "fileHash" TEXT,
    "skippedStale" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NetsisSyncLog" ("createdAt", "dryRun", "fileName", "id", "lockedSkipped", "matchedCodes", "message", "ok", "source", "totalCodes", "unmatchedCount", "unmatchedSample", "variantsUpdated", "zeroBalance") SELECT "createdAt", "dryRun", "fileName", "id", "lockedSkipped", "matchedCodes", "message", "ok", "source", "totalCodes", "unmatchedCount", "unmatchedSample", "variantsUpdated", "zeroBalance" FROM "NetsisSyncLog";
DROP TABLE "NetsisSyncLog";
ALTER TABLE "new_NetsisSyncLog" RENAME TO "NetsisSyncLog";
CREATE INDEX "NetsisSyncLog_createdAt_idx" ON "NetsisSyncLog"("createdAt");
CREATE INDEX "NetsisSyncLog_source_createdAt_idx" ON "NetsisSyncLog"("source", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
