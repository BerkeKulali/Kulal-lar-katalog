import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsRoot = path.resolve(process.cwd(), "prisma/migrations");

async function ensureMigrationsTable(client: ReturnType<typeof createClient>) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_turso_migrations" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "appliedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getApplied(client: ReturnType<typeof createClient>) {
  const rows = await client.execute(
    `SELECT "name" FROM "_turso_migrations" ORDER BY "name" ASC`
  );
  return new Set(rows.rows.map((r) => String(r.name)));
}

async function ensureVariantFeatureColumns(client: ReturnType<typeof createClient>) {
  const cols = await client.execute(`PRAGMA table_info("ProductVariant")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));

  if (!names.has("feature3D")) {
    await client.execute(
      `ALTER TABLE "ProductVariant" ADD COLUMN "feature3D" INTEGER NOT NULL DEFAULT 0`
    );
  }
  if (!names.has("featureRec")) {
    await client.execute(
      `ALTER TABLE "ProductVariant" ADD COLUMN "featureRec" INTEGER NOT NULL DEFAULT 0`
    );
  }
}

/**
 * netsisStockCode kolonu ve benzersiz index'ini idempotent ekler.
 * Yarıda kalan bir migration'da (kolon var, index yok gibi) tekrar
 * çalıştırıldığında hata vermemesi için varlık kontrolü yapar.
 */
async function ensureVariantNetsisColumn(
  client: ReturnType<typeof createClient>
) {
  const cols = await client.execute(`PRAGMA table_info("ProductVariant")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (!names.has("netsisStockCode")) {
    await client.execute(
      `ALTER TABLE "ProductVariant" ADD COLUMN "netsisStockCode" TEXT`
    );
  }
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_netsisStockCode_key" ON "ProductVariant"("netsisStockCode")`
  );
}

/**
 * netsisStockCode tek-kolonunu VariantNetsisCode tablosuna geçirir.
 * Idempotent: tablo/index varsa atlar, veri taşımayı yalnızca eski kolon
 * hâlâ varken yapar, kolonu yalnızca varsa düşürür.
 */
async function ensureVariantNetsisCodesTable(
  client: ReturnType<typeof createClient>
) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "VariantNetsisCode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL,
      "variantId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VariantNetsisCode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "VariantNetsisCode_code_key" ON "VariantNetsisCode"("code")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "VariantNetsisCode_variantId_idx" ON "VariantNetsisCode"("variantId")`
  );

  const cols = await client.execute(`PRAGMA table_info("ProductVariant")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (names.has("netsisStockCode")) {
    await client.execute(`
      INSERT INTO "VariantNetsisCode" ("id", "code", "variantId")
      SELECT lower(hex(randomblob(12))), "netsisStockCode", "id"
      FROM "ProductVariant"
      WHERE "netsisStockCode" IS NOT NULL AND TRIM("netsisStockCode") <> ''
    `);
    await client.execute(
      `DROP INDEX IF EXISTS "ProductVariant_netsisStockCode_key"`
    );
    await client.execute(
      `ALTER TABLE "ProductVariant" DROP COLUMN "netsisStockCode"`
    );
  }
}

/** AdminAuditLog tablosunu ve index'lerini idempotent oluşturur. */
async function ensureAdminAuditLogTable(
  client: ReturnType<typeof createClient>
) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "adminUserId" TEXT,
      "adminName" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "entityType" TEXT,
      "entityId" TEXT,
      "summary" TEXT,
      "meta" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt")`
  );
}

/** FamilyClickEvent tablosunu ve index'lerini idempotent oluşturur. */
async function ensureFamilyClickEventTable(
  client: ReturnType<typeof createClient>
) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "FamilyClickEvent" (
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
    )
  `);
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "FamilyClickEvent_familyId_createdAt_idx" ON "FamilyClickEvent"("familyId", "createdAt")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "FamilyClickEvent_salespersonId_createdAt_idx" ON "FamilyClickEvent"("salespersonId", "createdAt")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "FamilyClickEvent_createdAt_idx" ON "FamilyClickEvent"("createdAt")`
  );
}

/** ProductFamily.color + materialType kolonlarını idempotent ekler. */
async function ensureFamilyColorMaterialColumns(
  client: ReturnType<typeof createClient>
) {
  const cols = await client.execute(`PRAGMA table_info("ProductFamily")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (!names.has("color")) {
    await client.execute(`ALTER TABLE "ProductFamily" ADD COLUMN "color" TEXT`);
  }
  if (!names.has("materialType")) {
    await client.execute(
      `ALTER TABLE "ProductFamily" ADD COLUMN "materialType" TEXT`
    );
  }
}

/** SimilarFamily tablosunu ve index'lerini idempotent oluşturur. */
async function ensureSimilarFamilyTable(
  client: ReturnType<typeof createClient>
) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "SimilarFamily" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      "similarFamilyId" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SimilarFamily_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "SimilarFamily_similarFamilyId_fkey" FOREIGN KEY ("similarFamilyId") REFERENCES "ProductFamily" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "SimilarFamily_familyId_similarFamilyId_key" ON "SimilarFamily"("familyId", "similarFamilyId")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "SimilarFamily_familyId_idx" ON "SimilarFamily"("familyId")`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS "SimilarFamily_similarFamilyId_idx" ON "SimilarFamily"("similarFamilyId")`
  );
}

/** AppSettings.salesEnabled kolonunu idempotent ekler. */
async function ensureAppSettingsSalesEnabledColumn(
  client: ReturnType<typeof createClient>
) {
  const cols = await client.execute(`PRAGMA table_info("AppSettings")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (!names.has("salesEnabled")) {
    await client.execute(
      `ALTER TABLE "AppSettings" ADD COLUMN "salesEnabled" BOOLEAN NOT NULL DEFAULT true`
    );
  }
}

/** Device.showStock kolonunu idempotent ekler. */
async function ensureDeviceShowStockColumn(
  client: ReturnType<typeof createClient>
) {
  const cols = await client.execute(`PRAGMA table_info("Device")`);
  const names = new Set(cols.rows.map((r) => String(r.name)));
  if (!names.has("showStock")) {
    await client.execute(
      `ALTER TABLE "Device" ADD COLUMN "showStock" BOOLEAN NOT NULL DEFAULT false`
    );
  }
}

async function listMigrationDirs() {
  const entries = await readdir(migrationsRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function main() {
  // Build komutunun bir parçası olarak çalışabilir (npm run build). Turso
  // yapılandırması yoksa (ör. yerel SQLite ile build) hata fırlatmak yerine
  // sessizce ATLA — böylece `npm run build` her ortamda çalışır ve Vercel'de
  // Turso env'i mevcutken migration otomatik uygulanır.
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

  if (!url || (!url.startsWith("libsql://") && !url.startsWith("https://"))) {
    console.log(
      "turso-migrate: DATABASE_URL Turso değil; migration atlandı (yalnızca Turso'da uygulanır)."
    );
    return;
  }
  if (!authToken) {
    console.log(
      "turso-migrate: DATABASE_AUTH_TOKEN yok; migration atlandı."
    );
    return;
  }

  const client = createClient({ url, authToken });

  await ensureMigrationsTable(client);
  const applied = await getApplied(client);
  const dirs = await listMigrationDirs();

  let appliedCount = 0;
  for (const dir of dirs) {
    const sqlPath = path.join(migrationsRoot, dir, "migration.sql");
    const sql = await readFile(sqlPath, "utf8");
    if (applied.has(dir)) {
      console.log(`Atlandi: ${dir}`);
      continue;
    }

    console.log(`Uygulaniyor: ${dir}`);
    if (dir === "20260710140000_variant_features") {
      await ensureVariantFeatureColumns(client);
    }
    if (dir === "20260721140000_variant_netsis_stock_code") {
      // Idempotent kolon+index ekleme; ham ADD COLUMN tekrarını atla.
      await ensureVariantNetsisColumn(client);
    } else if (dir === "20260722150000_variant_netsis_codes_table") {
      // Idempotent tablo geçişi; ham DROP COLUMN tekrarını atla.
      await ensureVariantNetsisCodesTable(client);
    } else if (dir === "20260722160000_device_show_stock") {
      await ensureDeviceShowStockColumn(client);
    } else if (dir === "20260722170000_app_settings_sales_enabled") {
      await ensureAppSettingsSalesEnabledColumn(client);
    } else if (dir === "20260722180000_similar_family") {
      await ensureSimilarFamilyTable(client);
    } else if (dir === "20260722190000_family_color_material") {
      await ensureFamilyColorMaterialColumns(client);
    } else if (dir === "20260722200000_family_click_event") {
      await ensureFamilyClickEventTable(client);
    } else if (dir === "20260723120000_admin_audit_log") {
      await ensureAdminAuditLogTable(client);
    } else {
      await client.executeMultiple(sql);
    }
    await client.execute({
      sql: `INSERT INTO "_turso_migrations" ("name") VALUES (?)`,
      args: [dir],
    });
    appliedCount++;
  }

  console.log(`Tamam. Yeni uygulanan migration: ${appliedCount}`);
}

main().catch((err) => {
  console.error("Turso migration hatasi:", err);
  process.exit(1);
});
