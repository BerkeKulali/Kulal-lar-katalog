import "dotenv/config";
import { createClient } from "@libsql/client";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsRoot = path.resolve(process.cwd(), "prisma/migrations");

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} eksik.`);
  return value;
}

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

async function listMigrationDirs() {
  const entries = await readdir(migrationsRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function main() {
  const url = requireEnv("DATABASE_URL");
  if (!url.startsWith("libsql://") && !url.startsWith("https://")) {
    throw new Error(
      `DATABASE_URL Turso olmali. Mevcut: ${url.slice(0, 20)}...`
    );
  }

  const authToken = requireEnv("DATABASE_AUTH_TOKEN");
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
