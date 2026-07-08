import { spawnSync } from "node:child_process";
import {
  assertDestructiveAllowed,
  autoBackupBeforeDestructive,
} from "./lib/backup";

async function main() {
  await assertDestructiveAllowed("seed");
  await autoBackupBeforeDestructive("seed");

  const result = spawnSync("tsx", ["prisma/seed.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
