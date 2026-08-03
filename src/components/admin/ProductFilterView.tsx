"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { surfaceDisplayLabel } from "@/lib/constants";
import { qualityLabel } from "@/lib/utils";

type Brand = { id: string; name: string };
type MaterialType = { id: string; label: string };

type FilterRow = {
  variantId: string;
  familyId: string;
  familyName: string;
  brandName: string;
  size: string;
  surface: string;
  quality: "FIRST" | "END";
  stockM2: number;
  familyTotalStockM2: number;
};

type Basis = "family" | "variant";

type Preset = {
  id: string;
  name: string;
  brandIds: string[];
  materialType: string | null;
  quality: "FIRST" | "END" | null;
  basis: Basis;
  minM2: number | null;
  maxM2: number | null;
};

export function ProductFilterView({
  brands,
  materialTypes,
}: {
  brands: Brand[];
  materialTypes: MaterialType[];
}) {
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [materialType, setMaterialType] = useState("");
  const [quality, setQuality] = useState<"" | "FIRST" | "END">("");
  const [basis, setBasis] = useState<Basis>("family");
  const [minM2, setMinM2] = useState("");
  const [maxM2, setMaxM2] = useState("250");

  const [rows, setRows] = useState<FilterRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [savingPreset, setSavingPreset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (brandIds.length > 0) params.set("brandIds", brandIds.join(","));
    if (materialType) params.set("materialType", materialType);
    if (quality) params.set("quality", quality);
    params.set("basis", basis);
    if (minM2.trim()) params.set("minM2", minM2.trim());
    if (maxM2.trim()) params.set("maxM2", maxM2.trim());
    return params;
  }, [brandIds, materialType, quality, basis, minM2, maxM2]);

  const loadPresets = useCallback(async () => {
    const res = await fetch("/api/admin/campaigns/presets", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setPresets(data.presets ?? []);
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  async function runFilter(e?: FormEvent) {
    e?.preventDefault();
    const min = minM2.trim() ? Number(minM2) : null;
    const max = maxM2.trim() ? Number(maxM2) : null;
    if (min != null && (!Number.isFinite(min) || min < 0)) {
      setError("Geçerli bir 'en az m²' değeri girin");
      return;
    }
    if (max != null && (!Number.isFinite(max) || max < 0)) {
      setError("Geçerli bir 'en çok m²' değeri girin");
      return;
    }
    if (min != null && max != null && min >= max) {
      setError("'En az' değeri 'en çok' değerinden küçük olmalı");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/campaigns/filter?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Filtre çalıştırılamadı");
        setRows(null);
        return;
      }
      setRows(data.rows ?? []);
    } catch {
      setError("Filtre çalıştırılamadı");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleBrand(id: string) {
    setBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function applyPreset(preset: Preset) {
    setBrandIds(preset.brandIds);
    setMaterialType(preset.materialType ?? "");
    setQuality(preset.quality ?? "");
    setBasis(preset.basis);
    setMinM2(preset.minM2 != null ? String(preset.minM2) : "");
    setMaxM2(preset.maxM2 != null ? String(preset.maxM2) : "");
    setMessage(`"${preset.name}" segmenti yüklendi — Filtrele'ye basın`);
  }

  async function savePreset() {
    if (!presetName.trim()) return;
    setSavingPreset(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/campaigns/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          brandIds,
          materialType: materialType || null,
          quality: quality || null,
          basis,
          minM2: minM2.trim() ? Number(minM2) : null,
          maxM2: maxM2.trim() ? Number(maxM2) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Kaydedilemedi");
        return;
      }
      setPresetName("");
      await loadPresets();
      setMessage("Segment kaydedildi");
    } catch {
      setMessage("Kaydedilemedi");
    } finally {
      setSavingPreset(false);
    }
  }

  async function deletePreset(id: string) {
    if (!confirm("Bu kayıtlı segment silinsin mi?")) return;
    const res = await fetch(`/api/admin/campaigns/presets/${id}`, { method: "DELETE" });
    if (res.ok) await loadPresets();
  }

  return (
    <div className="space-y-6">
      {presets.length > 0 && (
        <div className="border border-[var(--app-border)] p-4">
          <p className="theme-muted mb-2 text-xs">Kayıtlı segmentler</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1 border border-[var(--app-border)] px-2 py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="hover:underline"
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  onClick={() => deletePreset(p.id)}
                  className="text-red-500"
                  title="Sil"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={runFilter}
        className="space-y-4 border border-[var(--app-border)] p-4"
      >
        {brands.length > 0 && (
          <div>
            <p className="theme-muted mb-1 text-xs">Marka (boş = tümü)</p>
            <div className="flex flex-wrap gap-3">
              {brands.map((b) => (
                <label key={b.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={brandIds.includes(b.id)}
                    onChange={() => toggleBrand(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="theme-muted mb-1 block text-xs">Malzeme tipi</label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              className="theme-select border px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              {materialTypes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="theme-muted mb-1 block text-xs">Kalite</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "" | "FIRST" | "END")}
              className="theme-select border px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              <option value="FIRST">1. Kalite</option>
              <option value="END">END</option>
            </select>
          </div>

          <div>
            <label className="theme-muted mb-1 block text-xs">Stok bazı</label>
            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value as Basis)}
              className="theme-select border px-3 py-2 text-sm"
            >
              <option value="family">Aile toplamı</option>
              <option value="variant">Varyant bazında</option>
            </select>
          </div>

          <div>
            <label className="theme-muted mb-1 block text-xs">En az (m²)</label>
            <input
              value={minM2}
              onChange={(e) => setMinM2(e.target.value)}
              placeholder="—"
              inputMode="decimal"
              className="theme-input w-24 border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="theme-muted mb-1 block text-xs">En çok (m²)</label>
            <input
              value={maxM2}
              onChange={(e) => setMaxM2(e.target.value)}
              placeholder="—"
              inputMode="decimal"
              className="theme-input w-24 border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="theme-muted text-[11px]">
          İkisi de girilirse aralık uygulanır (örn. en az 40, en çok 180 →
          40 ile 180 arası). En az sınırı dahildir, en çok sınırı dahil
          değildir. İkisi de boş bırakılırsa stok hiç filtrelenmez.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "Çalışıyor…" : "Filtrele"}
          </button>

          {rows && rows.length > 0 && (
            <>
              <a
                href={`/api/admin/campaigns/filter/export-xlsx?${query.toString()}`}
                className="theme-button border px-4 py-2 text-sm"
              >
                Excel indir
              </a>
              <a
                href={`/api/admin/campaigns/filter/export-pdf?${query.toString()}`}
                className="theme-button border px-4 py-2 text-sm"
              >
                PDF indir
              </a>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Segmenti kaydet (isim)"
              className="theme-input w-48 border px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={savePreset}
              disabled={savingPreset || !presetName.trim()}
              className="theme-button border px-3 py-2 text-xs disabled:opacity-40"
            >
              {savingPreset ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      {rows && (
        <div className="overflow-x-auto border border-[var(--app-border)]">
          <table className="w-full text-left text-xs">
            <thead className="theme-muted border-b border-[var(--app-border)]">
              <tr>
                <th className="p-3">Marka</th>
                <th className="p-3">Ürün</th>
                <th className="p-3">Ölçü</th>
                <th className="p-3">Yüzey / Kalite</th>
                <th className="p-3">Varyant Stok</th>
                <th className="p-3">Aile Toplam</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.variantId} className="border-b border-[var(--app-border)]">
                  <td className="theme-muted p-3">{r.brandName}</td>
                  <td className="p-3">{r.familyName}</td>
                  <td className="p-3">{r.size.toUpperCase()}</td>
                  <td className="theme-muted p-3">
                    {surfaceDisplayLabel(r.surface)} · {qualityLabel(r.quality)}
                  </td>
                  <td className="p-3">{r.stockM2.toLocaleString("tr-TR")} m²</td>
                  <td className="p-3">{r.familyTotalStockM2.toLocaleString("tr-TR")} m²</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="theme-muted p-6 text-center">
                    Bu kriterlere uyan ürün yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length > 0 && (
            <p className="theme-muted p-3 text-xs">{rows.length} ürün</p>
          )}
        </div>
      )}
    </div>
  );
}
