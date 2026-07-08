import { spawnSync } from "node:child_process";
import {
  assertDestructiveAllowed,
  autoBackupBeforeDestructive,
} from "./lib/backup";

async function main() {
  await assertDestructiveAllowed("reset");
  await autoBackupBeforeDestructive("reset");

  const result = spawnSync("npx", ["prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
