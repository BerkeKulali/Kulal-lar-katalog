#!/usr/bin/env tsx
import "dotenv/config";
import { syncGuralEndPricesAndPackaging } from "../src/lib/gural-sync";

async function main() {
  console.log("GÜRAL END fiyat + ambalaj senkronizasyonu...\n");
  const result = await syncGuralEndPricesAndPackaging();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
