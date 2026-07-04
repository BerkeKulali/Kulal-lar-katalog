"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FormEvent, useState } from "react";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("upsert");
  const [result, setResult] = useState<{
    updated: number;
    created: number;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const res = await fetch("/api/admin/prices", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult({ updated: 0, created: 0, errors: [data.error ?? "Hata"] });
      return;
    }

    setResult(data);
  }

  return (
    <AppShell variant="admin" className="py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-bold">Excel Import / Export</h1>
        <Link href="/admin" className="text-xs text-zinc-500">
          ← Admin
        </Link>
      </div>

      <section className="mb-10 border border-zinc-800 p-5">
        <h2 className="mb-3 text-sm font-semibold">Fiyat listesini indir</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Mevcut fiyatları Excel olarak indirin, düzenleyin ve tekrar yükleyin.
        </p>
        <a
          href="/api/admin/prices"
          className="inline-block border border-white px-4 py-2 text-sm hover:bg-white hover:text-black"
        >
          fiyat-listesi.xlsx indir
        </a>
      </section>

      <section className="mb-10 border border-zinc-800 p-5">
        <h2 className="mb-3 text-sm font-semibold">GÜRAL fiyat listesi (CSV)</h2>
        <p className="mb-4 text-xs text-zinc-500">
          GÜRAL&apos;ın gönderdiği toptan fiyat CSV dosyasını doğrudan yükleyin.
          Sütunlar: <strong>EBAT</strong>, <strong>ÜRÜN ADI</strong>,{" "}
          <strong>LİSTE FİYATI</strong> (veya fabrika / depo fiyatı). Ürün aileleri
          ve varyantlar otomatik oluşturulur.
        </p>
        <GuralCsvImportForm />
      </section>

      <section className="mb-10 border border-zinc-800 p-5">
        <h2 className="mb-3 text-sm font-semibold">GÜRAL END fiyat + ambalaj</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Tüm GÜRAL ürünleri için END fiyatlarını 1. kalitenin %20 indirimli
          haline ayarlar ve ölçü bazlı palet/kutu m² değerlerini günceller.
        </p>
        <GuralSyncForm />
      </section>

      <section className="border border-zinc-800 p-5">
        <h2 className="mb-3 text-sm font-semibold">Fiyat listesi yükle</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Sütunlar: marka_slug, aile, olcu, yuzey, kalite (1 veya END), fiyat,
          kod (opsiyonel)
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="upsert">Güncelle + yeni ekle</option>
            <option value="update-only">Sadece güncelle</option>
          </select>
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
          >
            {loading ? "Yükleniyor..." : "Yükle"}
          </button>
        </form>

        {result && (
          <div className="mt-6 space-y-2 text-sm">
            <p className="text-green-400">
              Güncellenen: {result.updated} · Yeni: {result.created}
            </p>
            {result.errors.length > 0 && (
              <ul className="max-h-48 overflow-y-auto text-xs text-red-400">
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mt-10 border border-zinc-800 p-5">
        <h2 className="mb-3 text-sm font-semibold">Netsis stok yükle</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Netsis&apos;ten aldığınız Excel&apos;i doğrudan yükleyin. Ürün kodu
          ile katalogdaki variant eşleşir; <strong>Özellik</strong> sütunu stok
          satırı etiketi olur (D35 - Q gibi). Miktar için önce{" "}
          <strong>Sipariş Alınabilir</strong>, yoksa Seramik Depo / Genel Toplam
          kullanılır.
        </p>
        <StockImportForm />
      </section>
    </AppShell>
  );
}

function GuralSyncForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    endCreated: number;
    endUpdated: number;
    packagingUpdated: number;
    firstVariantsProcessed: number;
    skippedNoPrice: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/gural/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Senkronizasyon başarısız");
        return;
      }
      setResult(data);
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="w-full border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
      >
        {loading ? "Güncelleniyor…" : "GÜRAL END + ambalaj senkronize et"}
      </button>
      {result && (
        <p className="text-sm text-green-400">
          END oluşturulan: {result.endCreated} · END güncellenen:{" "}
          {result.endUpdated} · Ambalaj güncellenen: {result.packagingUpdated}{" "}
          · 1. kalite işlenen: {result.firstVariantsProcessed}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function GuralCsvImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("upsert");
  const [priceColumn, setPriceColumn] = useState("liste");
  const [result, setResult] = useState<{
    parsed: number;
    updated: number;
    created: number;
    skipped: number;
    parseErrors: string[];
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    phase: string;
    current: number;
    total: number;
  } | null>(null);

  const BATCH_SIZE = 40;

  async function handleGuralSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);
    setProgress({ phase: "CSV okunuyor…", current: 0, total: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("priceColumn", priceColumn);

    try {
      const parseRes = await fetch("/api/admin/prices/gural/parse", {
        method: "POST",
        body: formData,
      });
      const parsed = await parseRes.json();

      if (!parseRes.ok) {
        setResult({
          parsed: 0,
          updated: 0,
          created: 0,
          skipped: parsed.skipped ?? 0,
          parseErrors: parsed.parseErrors ?? [],
          errors: [parsed.error ?? "CSV okunamadı"],
        });
        return;
      }

      const rows = parsed.rows as Array<Record<string, unknown>>;
      const total = rows.length;
      let updated = 0;
      let created = 0;
      const errors = [...(parsed.parseErrors ?? [])];

      setProgress({ phase: "Veritabanına yazılıyor…", current: 0, total });

      for (let offset = 0; offset < total; offset += BATCH_SIZE) {
        const batch = rows.slice(offset, offset + BATCH_SIZE);
        const batchIndex = Math.floor(offset / BATCH_SIZE);
        const isLast = offset + BATCH_SIZE >= total;

        const batchRes = await fetch("/api/admin/prices/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: batch,
            mode,
            brandSlug: "gural",
            batchIndex,
            rowOffset: offset,
            finalize: isLast,
          }),
        });

        const batchData = await batchRes.json();
        if (!batchRes.ok) {
          errors.push(batchData.error ?? `Parti ${batchIndex + 1} başarısız`);
          break;
        }

        updated += batchData.updated ?? 0;
        created += batchData.created ?? 0;
        errors.push(...(batchData.errors ?? []));

        setProgress({
          phase: "Veritabanına yazılıyor…",
          current: Math.min(offset + batch.length, total),
          total,
        });
      }

      setResult({
        parsed: total,
        updated,
        created,
        skipped: parsed.skipped ?? 0,
        parseErrors: parsed.parseErrors ?? [],
        errors,
      });
    } catch {
      setResult({
        parsed: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        parseErrors: [],
        errors: ["Bağlantı kesildi veya sunucu zaman aşımına uğradı. Tekrar deneyin."],
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : progress?.phase === "CSV okunuyor…"
        ? 8
        : 0;

  return (
    <form onSubmit={handleGuralSubmit} className="space-y-4">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <select
        value={priceColumn}
        onChange={(e) => setPriceColumn(e.target.value)}
        className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
      >
        <option value="liste">Liste fiyatı</option>
        <option value="fabrika">Fabrika sevk</option>
        <option value="depo">Depo teslim</option>
      </select>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
      >
        <option value="upsert">Güncelle + yeni ekle</option>
        <option value="update-only">Sadece güncelle</option>
      </select>
      <button
        type="submit"
        disabled={!file || loading}
        className="w-full border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
      >
        {loading ? "Aktarılıyor…" : "GÜRAL CSV yükle"}
      </button>

      {progress && (
        <div className="space-y-2 rounded border border-zinc-800 p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{progress.phase}</span>
            <span>
              {progress.total > 0
                ? `${progress.current} / ${progress.total} (%${progressPct})`
                : "…"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full rounded bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            440 ürün birkaç partide işlenir; çubuk ilerlemiyorsa sayfayı kapatmayın.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-2 text-sm">
          <p className="text-green-400">
            {result.parsed} satır işlendi · Güncellenen: {result.updated} · Yeni:{" "}
            {result.created}
            {result.skipped > 0 ? ` · Atlanan: ${result.skipped}` : ""}
          </p>
          {[...result.parseErrors, ...result.errors].length > 0 && (
            <ul className="max-h-48 overflow-y-auto text-xs text-red-400">
              {[...result.parseErrors, ...result.errors].map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

function StockImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState("replace");
  const [result, setResult] = useState<{
    variantsUpdated: number;
    stockLinesWritten: number;
    skippedCodes: string[];
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStockSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const res = await fetch("/api/admin/stock/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult({
        variantsUpdated: 0,
        stockLinesWritten: 0,
        skippedCodes: [],
        errors: [data.error ?? "Hata"],
      });
      return;
    }

    setResult(data);
  }

  return (
    <form onSubmit={handleStockSubmit} className="space-y-4">
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
      >
        <option value="replace">Eşleşen ürünlerde stoku tamamen yenile</option>
        <option value="upsert">Özellik etiketine göre güncelle / ekle</option>
      </select>
      <button
        type="submit"
        disabled={!file || loading}
        className="w-full border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
      >
        {loading ? "Aktarılıyor..." : "Stokları aktar"}
      </button>

      {result && (
        <div className="mt-6 space-y-2 text-sm">
          <p className="text-green-400">
            {result.variantsUpdated} ürün · {result.stockLinesWritten} stok satırı
            güncellendi
          </p>
          {result.skippedCodes.length > 0 && (
            <p className="text-xs text-amber-400">
              Eşleşmeyen kodlar ({result.skippedCodes.length}):{" "}
              {result.skippedCodes.slice(0, 8).join(", ")}
              {result.skippedCodes.length > 8 ? "…" : ""}
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="max-h-48 overflow-y-auto text-xs text-red-400">
              {result.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
