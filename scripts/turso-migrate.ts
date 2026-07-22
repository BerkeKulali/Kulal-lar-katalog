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
