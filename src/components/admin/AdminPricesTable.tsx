"use client";

import { useMemo, useState } from "react";
import { endPriceFromFirst } from "@/lib/prices";

type PriceRow = {
  id: string;
  brandSlug: string;
  brandName: string;
  familyName: string;
  size: string;
  surface: string;
  quality: "FIRST" | "END";
  price: number | null;
  code: string | null;
};

function rowMatchesFilters(
  row: PriceRow,
  filters: {
    brandSlug: string;
    size: string;
    surface: string;
    quality: string;
    familyName: string;
  }
) {
  return (
    (!filters.brandSlug || row.brandSlug === filters.brandSlug) &&
    (!filters.size || row.size === filters.size) &&
    (!filters.surface || row.surface === filters.surface) &&
    (!filters.quality || row.quality === filters.quality) &&
    (!filters.familyName ||
      row.familyName.toLowerCase().includes(filters.familyName.toLowerCase()))
  );
}

export function AdminPricesTable({ rows }: { rows: PriceRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.price == null ? "" : String(r.price)]))
  );
  const [tableRows, setTableRows] = useState<PriceRow[]>(rows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkSize, setBulkSize] = useState("");
  const [bulkSurface, setBulkSurface] = useState("");
  const [bulkQuality, setBulkQuality] = useState("");
  const [bulkFamily, setBulkFamily] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [showEndPrices, setShowEndPrices] = useState(false);

  const firstCount = useMemo(
    () => tableRows.filter((r) => r.quality === "FIRST").length,
    [tableRows]
  );
  const endCount = tableRows.length - firstCount;
  const visibleRows = useMemo(
    () =>
      showEndPrices
        ? tableRows
        : tableRows.filter((r) => r.quality === "FIRST"),
    [tableRows, showEndPrices]
  );

  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        tableRows.map((r) => [r.id, r.price == null ? "" : String(r.price)])
      ),
    [tableRows]
  );
  const brandOptions = useMemo(
    () => [...new Set(tableRows.map((r) => `${r.brandSlug}|${r.brandName}`))],
    [tableRows]
  );
  const sizeOptions = useMemo(
    () => [...new Set(tableRows.map((r) => r.size))].sort(),
    [tableRows]
  );
  const surfaceOptions = useMemo(
    () => [...new Set(tableRows.map((r) => r.surface))].sort(),
    [tableRows]
  );
  const familyOptions = useMemo(() => {
    const list = tableRows.filter((r) => !bulkBrand || r.brandSlug === bulkBrand);
    return [...new Set(list.map((r) => r.familyName))].sort();
  }, [tableRows, bulkBrand]);

  async function saveRow(row: PriceRow) {
    const raw = values[row.id]?.trim() ?? "";
    const parsed = Number(raw);
    if (raw !== "" && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Fiyat 0 veya daha büyük bir sayı olmalı.");
      setMessage(null);
      return;
    }
    const price = raw === "" ? null : parsed;

    setSavingId(row.id);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: row.id,
          price,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        syncedEnd?: { id: string; price: number } | null;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Fiyat güncellenemedi");
      }

      setTableRows((prev) =>
        prev.map((r) => {
          if (r.id === row.id) return { ...r, price };
          if (data.syncedEnd && r.id === data.syncedEnd.id) {
            return { ...r, price: data.syncedEnd.price };
          }
          return r;
        })
      );
      setValues((prev) => {
        const next = { ...prev, [row.id]: price == null ? "" : String(price) };
        if (data.syncedEnd) {
          next[data.syncedEnd.id] = String(data.syncedEnd.price);
        }
        return next;
      });
      const base = `${row.familyName} ${row.size.toUpperCase()} ${row.surface} ${row.quality === "FIRST" ? "1." : "END"} güncellendi.`;
      setMessage(
        data.syncedEnd
          ? `${base} END fiyatı otomatik ${data.syncedEnd.price} olarak ayarlandı.`
          : base
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fiyat güncellenemedi");
    } finally {
      setSavingId(null);
    }
  }

  async function applyBulk() {
    const price = Number(bulkPrice.trim());
    if (!Number.isFinite(price) || price < 0) {
      setError("Toplu fiyat 0 veya daha buyuk bir sayi olmali.");
      setMessage(null);
      return;
    }

    setBulkSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk",
          filters: {
            brandSlug: bulkBrand || null,
            size: bulkSize || null,
            surface: bulkSurface || null,
            quality: bulkQuality || null,
            familyName: bulkFamily.trim() || null,
          },
          price: Math.round(price),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        updatedCount?: number;
        syncedEndCount?: number;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Toplu guncelleme basarisiz");
      }

      const filters = {
        brandSlug: bulkBrand,
        size: bulkSize,
        surface: bulkSurface,
        quality: bulkQuality,
        familyName: bulkFamily.trim(),
      };
      const baseFilters = { ...filters, quality: "" };

      const nextPrice = Math.round(price);
      const autoEndPrice =
        bulkQuality === "FIRST" ? endPriceFromFirst(nextPrice) : null;

      setTableRows((prev) =>
        prev.map((r) => {
          if (rowMatchesFilters(r, filters)) {
            return { ...r, price: nextPrice };
          }
          if (
            autoEndPrice != null &&
            r.quality === "END" &&
            rowMatchesFilters(r, baseFilters)
          ) {
            return { ...r, price: autoEndPrice };
          }
          return r;
        })
      );
      setValues((prev) => {
        const next = { ...prev };
        for (const row of tableRows) {
          if (rowMatchesFilters(row, filters)) {
            next[row.id] = String(nextPrice);
          } else if (
            autoEndPrice != null &&
            row.quality === "END" &&
            rowMatchesFilters(row, baseFilters)
          ) {
            next[row.id] = String(autoEndPrice);
          }
        }
        return next;
      });

      const parts = [`${data.updatedCount ?? 0} satir toplu guncellendi.`];
      if ((data.syncedEndCount ?? 0) > 0) {
        parts.push(`${data.syncedEndCount} END fiyati otomatik hesaplandi.`);
      }
      setMessage(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu guncelleme basarisiz");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 space-y-3 border border-zinc-800 p-3">
        <p className="text-xs font-semibold text-zinc-300">Toplu fiyat guncelle</p>
        <p className="text-[11px] text-zinc-600">
          1. kalite guncellenince END fiyati otomatik olarak %20 indirimli
          hesaplanir ve yukari en yakin 5&apos;e yuvarlanir (or. 388 → 390).
          END fiyatlarini elle degistirmek icin tablonun ustundeki secenegi acin.
        </p>
        <div className="grid gap-2 sm:grid-cols-6">
          <label className="text-[11px] text-zinc-500">
            Marka
            <select
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              value={bulkBrand}
              onChange={(e) => setBulkBrand(e.target.value)}
            >
              <option value="">Tum markalar</option>
              {brandOptions.map((opt) => {
                const [slug, name] = opt.split("|");
                return (
                  <option key={opt} value={slug}>
                    {name}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            Olcu
            <select
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              value={bulkSize}
              onChange={(e) => setBulkSize(e.target.value)}
            >
              <option value="">Tumu</option>
              {sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            Yuzey
            <select
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              value={bulkSurface}
              onChange={(e) => setBulkSurface(e.target.value)}
            >
              <option value="">Tumu</option>
              {surfaceOptions.map((surface) => (
                <option key={surface} value={surface}>
                  {surface}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            Kalite
            <select
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              value={bulkQuality}
              onChange={(e) => setBulkQuality(e.target.value)}
            >
              <option value="">Tumu</option>
              <option value="FIRST">1. KLT</option>
              <option value="END">END</option>
            </select>
          </label>
          <label className="text-[11px] text-zinc-500">
            Aile (opsiyonel)
            <input
              list="family-options"
              value={bulkFamily}
              onChange={(e) => setBulkFamily(e.target.value)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              placeholder="Orn: ALASKA GREY"
            />
            <datalist id="family-options">
              {familyOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="text-[11px] text-zinc-500">
            Yeni fiyat
            <input
              type="number"
              min={0}
              step={1}
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-xs"
              placeholder="550"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void applyBulk()}
            disabled={bulkSaving}
            className="border border-white px-3 py-1.5 text-xs font-semibold hover:bg-white hover:text-black disabled:opacity-50"
          >
            {bulkSaving ? "Uygulaniyor..." : "Toplu Uygula"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {showEndPrices
            ? `${tableRows.length} satir (1. kalite + END)`
            : `${firstCount} satir (yalnizca 1. kalite)`}
        </p>
        <button
          type="button"
          onClick={() => setShowEndPrices((prev) => !prev)}
          className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
            showEndPrices
              ? "border-amber-500 bg-amber-500/10 text-amber-400"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          }`}
        >
          {showEndPrices
            ? "END fiyat duzenlemeyi kapat"
            : `END fiyat duzenle (${endCount} satir)`}
        </button>
      </div>

      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Aile</th>
              <th className="p-3">Olcu</th>
              <th className="p-3">Yuzey</th>
              {showEndPrices && <th className="p-3">Kalite</th>}
              <th className="p-3">Fiyat</th>
              <th className="p-3">Kod</th>
              <th className="p-3 text-right">Islem</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const dirty = (values[row.id] ?? "") !== (initialValues[row.id] ?? "");
              const isSaving = savingId === row.id;
              return (
                <tr key={row.id} className="border-b border-zinc-900">
                  <td className="p-3">{row.brandName}</td>
                  <td className="p-3 font-semibold">{row.familyName}</td>
                  <td className="p-3">{row.size.toUpperCase()}</td>
                  <td className="p-3">{row.surface}</td>
                  {showEndPrices && (
                    <td className="p-3">{row.quality === "FIRST" ? "1." : "END"}</td>
                  )}
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={values[row.id] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      className="w-28 border border-zinc-700 bg-black px-2 py-1.5 text-xs"
                      placeholder="—"
                    />
                  </td>
                  <td className="p-3 text-zinc-500">{row.code}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      disabled={!dirty || isSaving}
                      onClick={() => void saveRow(row)}
                      className="border border-zinc-700 px-2 py-1 hover:border-white disabled:opacity-50"
                    >
                      {isSaving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {message && <p className="mt-3 text-xs text-green-400">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <p className="mt-4 text-xs text-zinc-600">
        Toplu guncelleme icin Excel import kullanabilirsiniz.
      </p>
    </>
  );
}
