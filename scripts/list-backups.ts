import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { backupDir } from "./lib/backup";

async function main() {
  const dir = backupDir();
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.log("Henuz yedek yok. npm run db:backup ile olusturun.");
    return;
  }

  const entries = await Promise.all(
    files
      .filter((f) => f.endsWith(".db") || f.endsWith(".json"))
      .map(async (f) => {
        const full = path.join(dir, f);
        const s = await stat(full);
        return { name: f, size: s.size, mtime: s.mtime };
      })
  );

  entries.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (entries.length === 0) {
    console.log("Henuz yedek yok.");
    return;
  }

  console.log(`Yedekler (${dir}):\n`);
  for (const e of entries.slice(0, 20)) {
    const kb = Math.round(e.size / 1024);
    const when = e.mtime.toLocaleString("tr-TR");
    console.log(`  ${e.name}  (${kb} KB, ${when})`);
  }
  if (entries.length > 20) {
    console.log(`  ... ve ${entries.length - 20} dosya daha`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
