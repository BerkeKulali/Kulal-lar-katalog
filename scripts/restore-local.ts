import { copyFile } from "node:fs/promises";
import path from "node:path";
import {
  autoBackupBeforeDestructive,
  resolveLocalDbPath,
} from "./lib/backup";

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Kullanim: npm run db:restore:local -- backups/local-manual-....db");
    process.exit(1);
  }

  const sourcePath = path.resolve(source);
  const targetPath = resolveLocalDbPath();

  await autoBackupBeforeDestructive("restore-local");
  await copyFile(sourcePath, targetPath);

  console.log(`Geri yuklendi: ${sourcePath}`);
  console.log(`  -> ${targetPath}`);
  console.log("\nTurso'ya aktarmak icin: npm run db:sync:local-to-turso");
}

main().catch((err) => {
  console.error("Geri yukleme hatasi:", err);
  process.exit(1);
});
