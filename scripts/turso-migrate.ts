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
    await client.executeMultiple(sql);
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
