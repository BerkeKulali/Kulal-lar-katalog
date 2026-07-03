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
