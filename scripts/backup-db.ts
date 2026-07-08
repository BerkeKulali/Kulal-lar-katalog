import { backupAll, backupLocal } from "./lib/backup";

async function main() {
  const label = process.argv[2] ?? "manual";
  const localOnly = process.argv.includes("--local-only");
  const tursoOnly = process.argv.includes("--turso-only");

  if (localOnly) {
    await backupLocal(label);
    return;
  }
  if (tursoOnly) {
    const { backupTurso } = await import("./lib/backup");
    await backupTurso(label);
    return;
  }

  await backupAll(label);
  console.log("\nYedekler backups/ klasorunde.");
}

main().catch((err) => {
  console.error("Yedekleme hatasi:", err);
  process.exit(1);
});
