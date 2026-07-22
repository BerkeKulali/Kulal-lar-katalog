"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createPreImportBackup } from "@/lib/import-backup-client";
import { formatStock } from "@/lib/utils";

type Brand = { id: string; name: string };

type StockItem = {
  id: string;
  brandName: string;
  familyName: string;
  size: string;
  surface: string;
  quality: string;
  features: string;
  code: string | null;
  stockM2: number | null;
};

type ImportResult = {
  variantsUpdated: number;
  zeroBalanceUpdated: number;
  matchedCodes: number;
  totalCodes: number;
  unmatchedCodes: string[];
  errors: string[];
};

export function StockManager({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Manuel stok
  const [manualQty, setManualQty] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // CSV import
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/admin/stock/list?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Liste yüklenemedi");
        setItems([]);
      } else {
        setItems(data.items ?? []);
        setSelected(new Set());
      }
    } catch {
      setMessage("Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [brandId, q]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function handleManualSubmit() {
    const qty = Number(manualQty.replace(",", "."));
    if (selected.size === 0) {
      setMessage("Önce ürün seçin");
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setMessage("Geçerli bir stok miktarı girin (0 veya üzeri)");
      return;
    }
    setSavingManual(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/stock/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantIds: [...selected],
          quantityM2: qty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Sabitlenemedi");
      } else {
        setMessage(
          `${data.updated} ürünün stoğu ${formatStock(qty)} olarak sabitlendi` +
            (data.skipped ? ` · ${data.skipped} atlandı` : "")
        );
        setManualQty("");
        await load();
      }
    } catch {
      setMessage("Sabitlenemedi");
    } finally {
      setSavingManual(false);
    }
  }

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function runImport() {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);

    const backup = await createPreImportBackup("netsis-stock");
    if (!backup.ok) {
      setImporting(false);
      setImportError(backup.error ?? "Yedek alınamadı");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/stock/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "İçe aktarma başarısız");
      } else {
        setImportResult(data);
        await load();
      }
    } catch {
      setImportError("İçe aktarma başarısız");
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = selected.size;
  const stockLabel = useMemo(() => {
    const n = Number(manualQty.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? formatStock(n) : "—";
  }, [manualQty]);

  return (
    <div className="space-y-6">
      {/* CSV / Netsis içe aktarma */}
      <details className="border border-[var(--app-border)] p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          Netsis / CSV stok içe aktar
        </summary>
        <div className="mt-3 space-y-3">
          <p className="theme-muted text-[11px]">
            Eşleşme, varyantlara atanmış{" "}
            <a href="/admin/netsis" className="underline hover:opacity-80">
              Netsis stok kodları
            </a>{" "}
            ile yapılır. Bakiye 0 olanlar da 0 m² olarak yazılır. Dosya sütunları:{" "}
            <span className="font-mono">Stok Kodu</span>,{" "}
            <span className="font-mono">Bakiye</span>.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setImportResult(null);
              setImportError(null);
            }}
            className="block w-full text-sm"
          />
          <button
            type="button"
            onClick={runImport}
            disabled={!file || importing}
            className="theme-button border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {importing ? "Aktarılıyor…" : "İçe aktar"}
          </button>

          {importError && <p className="text-sm text-red-500">{importError}</p>}
          {importResult && (
            <div className="space-y-1 text-sm">
              <p className="text-green-600">
                {importResult.matchedCodes}/{importResult.totalCodes} kod eşleşti ·{" "}
                {importResult.variantsUpdated} ürün güncellendi
                {importResult.zeroBalanceUpdated > 0 &&
                  ` (${importResult.zeroBalanceUpdated} tanesi 0 stok)`}
              </p>
              {importResult.unmatchedCodes.length > 0 && (
                <details className="text-xs text-amber-500">
                  <summary className="cursor-pointer">
                    Eşleşmeyen kodlar ({importResult.unmatchedCodes.length})
                  </summary>
                  <p className="mt-1 max-h-40 overflow-y-auto break-words">
                    {importResult.unmatchedCodes.join(", ")}
                  </p>
                </details>
              )}
              {importResult.errors.length > 0 && (
                <ul className="max-h-40 overflow-y-auto text-xs text-red-500">
                  {importResult.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </details>

      {/* Filtre */}
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-center gap-3"
      >
        {brands.length > 0 && (
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="theme-select border px-3 py-2 text-sm"
          >
            <option value="">Tüm markalar</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ürün adı / kod ara"
          className="theme-input min-w-[12rem] flex-1 border px-3 py-2 text-sm"
        />
        <button type="submit" className="theme-button border px-4 py-2 text-sm">
          Filtrele
        </button>
      </form>

      <div className="theme-muted flex items-center justify-between text-xs">
        <span>{loading ? "Yükleniyor…" : `${items.length} varyant`}</span>
        <span>{selectedCount > 0 && `${selectedCount} seçili`}</span>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Tümünü seç"
                />
              </th>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Ölçü</th>
              <th className="p-3">Yüzey / Kalite</th>
              <th className="p-3">Mevcut Stok</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--app-border)]">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                </td>
                <td className="theme-muted p-3">{item.brandName}</td>
                <td className="p-3">
                  {item.familyName}
                  {item.features && (
                    <span className="theme-muted ml-1 text-[10px]">
                      {item.features}
                    </span>
                  )}
                </td>
                <td className="p-3">{item.size}</td>
                <td className="theme-muted p-3">
                  {item.surface} · {item.quality}
                </td>
                <td className="p-3">
                  {item.stockM2 == null ? (
                    <span className="theme-muted">—</span>
                  ) : (
                    formatStock(item.stockM2)
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="theme-muted p-6 text-center">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manuel stok sabitleme çubuğu */}
      <div
        className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--app-border)] py-3"
        style={{ background: "var(--app-main-bg)" }}
      >
        <span className="theme-muted mr-auto text-xs">
          Seçili ürünlerin stoğunu girilen değere sabitler ({stockLabel})
        </span>
        <input
          value={manualQty}
          onChange={(e) => setManualQty(e.target.value)}
          inputMode="decimal"
          placeholder="m²"
          className="theme-input w-28 border px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleManualSubmit}
          disabled={savingManual || selectedCount === 0 || manualQty.trim() === ""}
          className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {savingManual
            ? "Sabitleniyor…"
            : `Seçili ${selectedCount} ürünü sabitle`}
        </button>
      </div>
    </div>
  );
}
