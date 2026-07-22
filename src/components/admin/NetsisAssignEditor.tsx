"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Brand = { id: string; name: string };

type VariantItem = {
  id: string;
  brandName: string;
  familyName: string;
  size: string;
  surface: string;
  quality: string;
  features: string;
  code: string | null;
  netsisStockCode: string | null;
};

type SaveConflict = { variantId: string; code: string; reason: string };

export function NetsisAssignEditor({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [q, setQ] = useState("");
  const [onlyUnset, setOnlyUnset] = useState(false);
  const [items, setItems] = useState<VariantItem[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SaveConflict[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    setConflicts([]);
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (q.trim()) params.set("q", q.trim());
    if (onlyUnset) params.set("onlyUnset", "1");

    try {
      const res = await fetch(`/api/admin/netsis-codes?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Liste yüklenemedi");
        setItems([]);
      } else {
        setItems(data.items ?? []);
        setEdited({});
      }
    } catch {
      setMessage("Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [brandId, q, onlyUnset]);

  useEffect(() => {
    load();
  }, [load]);

  function currentValue(item: VariantItem): string {
    return edited[item.id] ?? item.netsisStockCode ?? "";
  }

  function setValue(id: string, value: string) {
    setEdited((prev) => ({ ...prev, [id]: value }));
  }

  // Değişen satırlar: girilen değer mevcut değerden farklıysa.
  const changed = useMemo(() => {
    return items.filter((item) => {
      if (!(item.id in edited)) return false;
      const next = edited[item.id].trim().toUpperCase();
      const current = (item.netsisStockCode ?? "").toUpperCase();
      return next !== current;
    });
  }, [items, edited]);

  // İstemci tarafı tekrar kontrolü: aynı kodu iki satıra girme uyarısı.
  const duplicateCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const val = currentValue(item).trim().toUpperCase();
      if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()].filter(([, n]) => n > 1).map(([code]) => code)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, edited]);

  async function handleSave() {
    if (changed.length === 0) return;
    setSaving(true);
    setMessage(null);
    setConflicts([]);

    const entries = changed.map((item) => ({
      variantId: item.id,
      netsisStockCode: edited[item.id].trim() || null,
    }));

    try {
      const res = await fetch("/api/admin/netsis-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Kaydedilemedi");
      } else {
        setConflicts(data.conflicts ?? []);
        setMessage(
          `${data.saved} varyant kaydedildi` +
            (data.conflicts?.length
              ? ` · ${data.conflicts.length} çakışma`
              : "")
        );
        await load();
      }
    } catch {
      setMessage("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  const conflictById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of conflicts) map.set(c.variantId, c.reason);
    return map;
  }, [conflicts]);

  const assignedCount = items.filter((i) => i.netsisStockCode).length;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-center gap-3"
      >
        {brands.length > 0 && (
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="border border-zinc-700 bg-black px-3 py-2 text-sm"
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
          className="min-w-[12rem] flex-1 border border-zinc-700 bg-black px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={onlyUnset}
            onChange={(e) => setOnlyUnset(e.target.checked)}
          />
          Yalnızca kodsuzlar
        </label>
        <button
          type="submit"
          className="border border-zinc-600 px-4 py-2 text-sm hover:border-white"
        >
          Filtrele
        </button>
      </form>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {loading
            ? "Yükleniyor…"
            : `${items.length} varyant · ${assignedCount} kod atanmış`}
        </span>
        <span>{changed.length > 0 && `${changed.length} değişiklik`}</span>
      </div>

      {message && (
        <p
          className={`text-sm ${
            conflicts.length > 0 ? "text-amber-400" : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}

      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Ölçü</th>
              <th className="p-3">Yüzey / Kalite</th>
              <th className="p-3">Netsis Stok Kodu</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const val = currentValue(item);
              const isDup = val.trim() !== "" && duplicateCodes.has(val.trim().toUpperCase());
              const conflict = conflictById.get(item.id);
              return (
                <tr key={item.id} className="border-b border-zinc-900">
                  <td className="p-3 text-zinc-400">{item.brandName}</td>
                  <td className="p-3">
                    {item.familyName}
                    {item.features && (
                      <span className="ml-1 text-[10px] text-zinc-500">
                        {item.features}
                      </span>
                    )}
                    {item.code && (
                      <span className="block text-[10px] text-zinc-600">
                        {item.code}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{item.size}</td>
                  <td className="p-3 text-zinc-400">
                    {item.surface} · {item.quality}
                  </td>
                  <td className="p-3">
                    <input
                      value={val}
                      onChange={(e) => setValue(item.id, e.target.value)}
                      placeholder="—"
                      spellCheck={false}
                      className={`w-44 border bg-black px-2 py-1 font-mono text-xs uppercase outline-none ${
                        conflict
                          ? "border-red-600"
                          : isDup
                            ? "border-amber-600"
                            : item.id in edited
                              ? "border-sky-600"
                              : "border-zinc-700"
                      }`}
                    />
                    {conflict && (
                      <span className="mt-1 block text-[10px] text-red-400">
                        {conflict}
                      </span>
                    )}
                    {!conflict && isDup && (
                      <span className="mt-1 block text-[10px] text-amber-400">
                        Bu kod birden çok satırda
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-zinc-800 bg-black/90 py-3 backdrop-blur">
        {duplicateCodes.size > 0 && (
          <span className="text-xs text-amber-400">
            Tekrar eden kodları düzeltin
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changed.length === 0 || duplicateCodes.size > 0}
          className="border border-white px-5 py-2 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
        >
          {saving ? "Kaydediliyor…" : `Kaydet (${changed.length})`}
        </button>
      </div>
    </div>
  );
}
