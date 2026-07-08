import "dotenv/config";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_TABLES } from "./db-tables";

const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const KEEP_COUNT = 30;

export function backupDir() {
  return BACKUP_DIR;
}

export function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export function resolveLocalDbPath(url?: string) {
  const fromEnv =
    process.env.LOCAL_DATABASE_URL?.trim() ??
    (activeDatabaseUrl().startsWith("file:")
      ? activeDatabaseUrl()
      : "file:./dev.db");
  const value = url?.trim() ?? fromEnv;
  if (!value.startsWith("file:")) {
    throw new Error(`Yerel dosya bekleniyor (file:...). Mevcut: ${value.slice(0, 24)}...`);
  }
  return path.resolve(process.cwd(), value.replace(/^file:/, ""));
}

export function isTursoUrl(url: string) {
  return url.startsWith("libsql://") || url.startsWith("https://");
}

export function activeDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? "file:./dev.db";
}

async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true });
}

async function pruneOldBackups(prefix: string) {
  const files = (await readdir(BACKUP_DIR))
    .filter((f) => f.startsWith(prefix))
    .sort()
    .reverse();
  for (const file of files.slice(KEEP_COUNT)) {
    await unlink(path.join(BACKUP_DIR, file));
  }
}

export async function summarizeSqlite(filePath: string) {
  if (!(await fileExists(filePath))) return null;
  const db = new Database(filePath, { readonly: true });
  try {
    const variants = (
      db.prepare(`SELECT COUNT(*) AS c FROM ProductVariant`).get() as { c: number }
    ).c;
    const salespeople = (
      db
        .prepare(`SELECT name FROM Salesperson ORDER BY name`)
        .all() as { name: string }[]
    ).map((r) => r.name);
    return { variants, salespeople };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export type BackupManifest = {
  exportedAt: string;
  source: "local" | "turso";
  label: string;
  tables: Record<string, Record<string, unknown>[]>;
  summary?: {
    variants: number;
    salespeople: string[];
  };
};

async function exportSqliteToManifest(
  filePath: string,
  source: "local" | "turso",
  label: string
): Promise<BackupManifest> {
  const db = new Database(filePath, { readonly: true });
  const tables: BackupManifest["tables"] = {};
  try {
    for (const table of DATA_TABLES) {
      try {
        tables[table] = db.prepare(`SELECT * FROM "${table}"`).all() as Record<
          string,
          unknown
        >[];
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/no such table/i.test(message)) {
          tables[table] = [];
          continue;
        }
        throw err;
      }
    }
  } finally {
    db.close();
  }
  const summary = await summarizeSqlite(filePath);
  return {
    exportedAt: new Date().toISOString(),
    source,
    label,
    tables,
    summary: summary
      ? { variants: summary.variants, salespeople: summary.salespeople }
      : undefined,
  };
}

async function exportTursoToManifest(label: string): Promise<BackupManifest> {
  const url = process.env.DATABASE_URL!.trim();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
  if (!authToken) throw new Error("DATABASE_AUTH_TOKEN eksik.");
  const client = createClient({ url, authToken });
  const tables: BackupManifest["tables"] = {};

  for (const table of DATA_TABLES) {
    try {
      const result = await client.execute(`SELECT * FROM "${table}"`);
      tables[table] = result.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          obj[key] = value;
        }
        return obj;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/no such table/i.test(message)) {
        tables[table] = [];
        continue;
      }
      throw err;
    }
  }

  const variantRows = tables.ProductVariant ?? [];
  const salespeople = (tables.Salesperson ?? []).map((r) => String(r.name));

  return {
    exportedAt: new Date().toISOString(),
    source: "turso",
    label,
    tables,
    summary: {
      variants: variantRows.length,
      salespeople,
    },
  };
}

async function writeManifest(manifest: BackupManifest, baseName: string) {
  const jsonPath = path.join(BACKUP_DIR, `${baseName}.json`);
  await writeFile(jsonPath, JSON.stringify(manifest, null, 2), "utf8");
  return jsonPath;
}

export async function backupLocal(label = "manual") {
  await ensureBackupDir();
  const sourcePath = resolveLocalDbPath();
  if (!(await fileExists(sourcePath))) {
    throw new Error(`Yerel veritabani bulunamadi: ${sourcePath}`);
  }

  const ts = timestamp();
  const baseName = `local-${label}-${ts}`;
  const dbCopyPath = path.join(BACKUP_DIR, `${baseName}.db`);
  await copyFile(sourcePath, dbCopyPath);

  const manifest = await exportSqliteToManifest(sourcePath, "local", label);
  const jsonPath = await writeManifest(manifest, baseName);

  await pruneOldBackups("local-");
  console.log(`Yerel yedek: ${dbCopyPath}`);
  if (manifest.summary) {
    console.log(
      `  ${manifest.summary.variants} varyant, plasiyer: ${manifest.summary.salespeople.join(", ") || "(yok)"}`
    );
  }
  console.log(`  JSON: ${jsonPath}`);
  return { dbCopyPath, jsonPath, manifest };
}

export async function backupTurso(label = "manual") {
  await ensureBackupDir();
  const url = activeDatabaseUrl();
  if (!isTursoUrl(url)) {
    console.log("DATABASE_URL Turso degil — Turso yedegi atlandi.");
    return null;
  }

  const ts = timestamp();
  const baseName = `turso-${label}-${ts}`;
  const manifest = await exportTursoToManifest(label);
  const jsonPath = await writeManifest(manifest, baseName);

  await pruneOldBackups("turso-");
  console.log(`Turso yedek: ${jsonPath}`);
  if (manifest.summary) {
    console.log(
      `  ${manifest.summary.variants} varyant, plasiyer: ${manifest.summary.salespeople.join(", ") || "(yok)"}`
    );
  }
  return { jsonPath, manifest };
}

export async function backupAll(label = "manual") {
  const results: { local?: Awaited<ReturnType<typeof backupLocal>>; turso?: Awaited<ReturnType<typeof backupTurso>> } = {};
  const localPath = resolveLocalDbPath();
  if (await fileExists(localPath)) {
    results.local = await backupLocal(label);
  }
  results.turso = await backupTurso(label);
  return results;
}

export async function countVariantsInActiveDb() {
  const url = activeDatabaseUrl();
  if (isTursoUrl(url)) {
    const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
    if (!authToken) return 0;
    const client = createClient({ url, authToken });
    const result = await client.execute(`SELECT COUNT(*) AS c FROM ProductVariant`);
    return Number(result.rows[0]?.c ?? 0);
  }
  const summary = await summarizeSqlite(resolveLocalDbPath(url));
  return summary?.variants ?? 0;
}

export async function assertDestructiveAllowed(
  operation: string,
  options?: { tursoOverwrite?: boolean }
) {
  const url = activeDatabaseUrl();
  const count = await countVariantsInActiveDb();
  const isTurso = isTursoUrl(url);
  const forced = process.env.ALLOW_DESTRUCTIVE_DB === "1";

  if (isTurso && !options?.tursoOverwrite && !forced) {
    throw new Error(
      [
        `"${operation}" Turso (canli) veritabaninda engellendi.`,
        "Yerel gelistirme: DATABASE_URL=file:./dev.db",
        "Zorunlu ise once npm run db:backup:turso, sonra ALLOW_DESTRUCTIVE_DB=1",
      ].join(" ")
    );
  }

  if (count > 10 && !forced) {
    throw new Error(
      [
        `"${operation}" engellendi: veritabaninda ${count} varyant var.`,
        "Once: npm run db:backup",
        "Gerekirse: ALLOW_DESTRUCTIVE_DB=1 ile calistirin.",
      ].join(" ")
    );
  }
}

export async function autoBackupBeforeDestructive(operation: string) {
  await ensureBackupDir();
  console.log(`[yedek] ${operation} oncesi otomatik yedek aliniyor...`);
  return backupAll(`pre-${operation}`);
}

export async function loadManifest(jsonPath: string): Promise<BackupManifest> {
  const raw = await readFile(path.resolve(jsonPath), "utf8");
  return JSON.parse(raw) as BackupManifest;
}
