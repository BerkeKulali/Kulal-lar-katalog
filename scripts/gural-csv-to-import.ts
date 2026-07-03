#!/usr/bin/env tsx
/**
 * GÜRAL toptan fiyat CSV → admin import Excel
 *
 * Kullanım:
 *   npx tsx scripts/gural-csv-to-import.ts [csv-yolu] [çıktı.xlsx]
 *
 * Fiyat sütunu: LİSTE FİYATI (varsayılan). FABRİKA veya DEPO için:
 *   GURAL_PRICE_COLUMN=fabrika npx tsx scripts/gural-csv-to-import.ts ...
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import {
  parseGuralPriceCsvRows,
  type GuralPriceColumn,
} from "../src/lib/gural-import";

function findDefaultCsv() {
  const downloads = path.join(process.env.HOME ?? "", "Downloads");
  const match = fs
    .readdirSync(downloads)
    .find((name) => name.includes("580") && name.toLowerCase().endsWith(".csv"));
  if (!match) {
    throw new Error("Downloads klasöründe 580 CSV bulunamadı");
  }
  return path.join(downloads, match);
}

function main() {
  const inputPath = process.argv[2] ?? findDefaultCsv();
  const outputPath =
    process.argv[3] ??
    path.join(
      process.cwd(),
      "backups",
      `gural-import-${new Date().toISOString().slice(0, 10)}.xlsx`
    );

  const priceKind = (process.env.GURAL_PRICE_COLUMN ?? "liste").toLowerCase() as GuralPriceColumn;

  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const { rows: importRows, errors } = parseGuralPriceCsvRows(rawRows, priceKind);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const outBook = XLSX.utils.book_new();
  const outSheet = XLSX.utils.json_to_sheet(importRows);
  XLSX.utils.book_append_sheet(outBook, outSheet, "Fiyatlar");
  XLSX.writeFile(outBook, outputPath);

  const surfaceCounts = importRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.yuzey);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Kaynak: ${inputPath}`);
  console.log(`Çıktı: ${outputPath}`);
  console.log(`Fiyat sütunu: ${priceKind}`);
  console.log(`Başarılı: ${importRows.length} / ${rawRows.length}`);
  console.log("Yüzey dağılımı:", surfaceCounts);
  if (errors.length) {
    console.log(`\nHatalar (${errors.length}):`);
    for (const err of errors) console.log(`  - ${err}`);
  }
}

main();
