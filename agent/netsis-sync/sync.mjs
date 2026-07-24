#!/usr/bin/env node
// Netsis stok senkron ajanı — ofisteki (on-prem) makinede çalışır.
//
// Görevi tek satırla: izlenen klasördeki EN YENİ Netsis stok dosyasını
// (Excel/CSV) uygulamanın güvenli ucuna yükler. Tüm ayrıştırma/eşleştirme
// sunucuda yapılır; bu script bilerek "aptal" ve bağımlılıksızdır
// (Node 18+ yerleşik fetch/FormData/Blob kullanır).
//
// Yapılandırma — ortam değişkenleri (run.bat içinde ayarlanır):
//   NETSIS_SYNC_URL     Zorunlu. Ör: https://katalog.example.com/api/integrations/netsis/stock
//   NETSIS_INGEST_TOKEN Zorunlu. Sunucudaki ile AYNI token.
//   NETSIS_WATCH_DIR    Zorunlu. Netsis'in stok dosyasını yazdığı klasör.
//   NETSIS_FILE_EXT     Opsiyonel. Virgülle uzantılar (varsayılan: xlsx,xls,csv)
//   NETSIS_DRY_RUN      Opsiyonel. "1" → sunucu yazmadan ne değişeceğini döndürür.
//   NETSIS_MAX_AGE_MIN  Opsiyonel. Dosya bu dakikadan eskiyse gönderme (bayat koruması).
//
// Çıkış kodu 0 = başarı, 1 = hata (Task Scheduler "son çalışma sonucu"nda görünür).

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`[netsis-sync] Eksik ortam değişkeni: ${name}`);
    process.exit(1);
  }
  return v;
}

function log(...args) {
  console.log(`[netsis-sync ${new Date().toISOString()}]`, ...args);
}

async function newestFile(dir, exts) {
  const entries = await readdir(dir, { withFileTypes: true });
  let best = null;
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).slice(1).toLowerCase();
    if (!exts.includes(ext)) continue;
    // Geçici/kilit dosyalarını atla (Excel ~$ ile başlar).
    if (e.name.startsWith("~$") || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    const s = await stat(full);
    if (!best || s.mtimeMs > best.mtimeMs) {
      best = { name: e.name, full, mtimeMs: s.mtimeMs };
    }
  }
  return best;
}

async function main() {
  const url = requireEnv("NETSIS_SYNC_URL");
  const token = requireEnv("NETSIS_INGEST_TOKEN");
  const dir = requireEnv("NETSIS_WATCH_DIR");
  const exts = (process.env.NETSIS_FILE_EXT ?? "xlsx,xls,csv")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const dryRun = process.env.NETSIS_DRY_RUN?.trim() === "1";
  const maxAgeMin = Number(process.env.NETSIS_MAX_AGE_MIN ?? "0");

  const file = await newestFile(dir, exts);
  if (!file) {
    console.error(`[netsis-sync] Klasörde uygun dosya yok: ${dir} (${exts.join(", ")})`);
    process.exit(1);
  }

  if (maxAgeMin > 0) {
    const ageMin = (Date.now() - file.mtimeMs) / 60000;
    if (ageMin > maxAgeMin) {
      console.error(
        `[netsis-sync] En yeni dosya çok eski (${ageMin.toFixed(0)} dk > ${maxAgeMin} dk): ${file.name}. Gönderilmedi.`
      );
      process.exit(1);
    }
  }

  log(`Gönderiliyor: ${file.name}${dryRun ? " (deneme)" : ""}`);

  const bytes = await readFile(file.full);
  const form = new FormData();
  form.append("file", new Blob([bytes]), file.name);

  const endpoint = dryRun ? `${url}?dryRun=1` : url;
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (err) {
    console.error(`[netsis-sync] Bağlantı hatası: ${err?.message ?? err}`);
    process.exit(1);
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    console.error(`[netsis-sync] Sunucu ${res.status}:`, JSON.stringify(data));
    process.exit(1);
  }

  log(
    `Başarılı: ${data.matchedCodes}/${data.totalCodes} kod eşleşti · ` +
      `${data.variantsUpdated} ürün güncellendi · ` +
      `${data.lockedSkipped ?? 0} kilitli atlandı · ` +
      `${data.unmatchedCodes?.length ?? 0} eşleşmeyen`
  );
  if (data.unmatchedCodes?.length) {
    log(`Eşleşmeyen (ilk 20): ${data.unmatchedCodes.slice(0, 20).join(", ")}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[netsis-sync] Beklenmeyen hata:", err);
  process.exit(1);
});
