"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { parseNetsisCodesInput } from "@/lib/netsis-stock-import";

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
  codes: string[];
};

type SaveConflict = { variantId: string; code: string; reason: string };

/** Bir varyantın kod kümesini kanonik (sıralı, benzersiz) metne çevirir. */
function canonical(codes: string[]): string {
  return [...new Set(codes.map((c) => c.trim().toUpperCase()))]
    .sort()
    .join(",");
}

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

  // Input'ta gösterilen ham metin (edited > mevcut kodlar).
  function inputValue(item: VariantItem): string {
    return edited[item.id] ?? item.codes.join(", ");
  }

  function setValue(id: string, value: string) {
    setEdited((prev) => ({ ...prev, [id]: value }));
  }

  // Değişen satırlar: girilen kod kümesi mevcut kümeden farklıysa.
  const changed = useMemo(() => {
    return items.filter((item) => {
      if (!(item.id in edited)) return false;
      return (
        canonical(parseNetsisCodesInput(edited[item.id])) !==
        canonical(item.codes)
      );
    });
  }, [items, edited]);

  // İstemci tarafı tekrar kontrolü: aynı kod iki satırda girilmiş mi.
  const duplicateCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const code of parseNetsisCodesInput(inputValue(item))) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    return new Set(
      [...counts.entries()].filter(([, n]) => n > 1).map(([code]) => code)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, edited]);

  function rowHasDuplicate(item: VariantItem): boolean {
    return parseNetsisCodesInput(inputValue(item)).some((c) =>
      duplicateCodes.has(c)
    );
  }

  async function handleSave() {
    if (changed.length === 0) return;
    setSaving(true);
    setMessage(null);
    setConflicts([]);

    const entries = changed.map((item) => ({
      variantId: item.id,
      codes: parseNetsisCodesInput(edited[item.id]),
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
    const map = new Map<string, string[]>();
    for (const c of conflicts) {
      const list = map.get(c.variantId) ?? [];
      list.push(c.reason);
      map.set(c.variantId, list);
    }
    return map;
  }, [conflicts]);

  const assignedCount = items.filter((i) => i.codes.length > 0).length;

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
        <label className="theme-muted flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={onlyUnset}
            onChange={(e) => setOnlyUnset(e.target.checked)}
          />
          Yalnızca kodsuzlar
        </label>
        <button
          type="submit"
          className="theme-button border px-4 py-2 text-sm"
        >
          Filtrele
        </button>
      </form>

      <div className="theme-muted flex items-center justify-between text-xs">
        <span>
          {loading
            ? "Yükleniyor…"
            : `${items.length} varyant · ${assignedCount} kodlu`}
        </span>
        <span>{changed.length > 0 && `${changed.length} değişiklik`}</span>
      </div>

      {message && (
        <p
          className={`text-sm ${
            conflicts.length > 0 ? "text-amber-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      <p className="theme-muted text-[11px]">
        Bir varyantın birden çok kodu varsa hepsini virgül veya boşlukla
        ayırarak yazın (ör. <span className="font-mono">GRS0001, GRS0001-D</span>
        ). Stok içe aktarımında bu kodların bakiyeleri toplanır.
      </p>

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Ölçü</th>
              <th className="p-3">Yüzey / Kalite</th>
              <th className="p-3">Netsis Stok Kodları</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const val = inputValue(item);
              const isDup = rowHasDuplicate(item);
              const rowConflicts = conflictById.get(item.id);
              const isEdited = item.id in edited;
              return (
                <tr
                  key={item.id}
                  className="border-b border-[var(--app-border)]"
                >
                  <td className="theme-muted p-3">{item.brandName}</td>
                  <td className="p-3">
                    {item.familyName}
                    {item.features && (
                      <span className="theme-muted ml-1 text-[10px]">
                        {item.features}
                      </span>
                    )}
                    {item.code && (
                      <span className="theme-muted block text-[10px] opacity-70">
                        {item.code}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{item.size}</td>
                  <td className="theme-muted p-3">
                    {item.surface} · {item.quality}
                  </td>
                  <td className="p-3">
                    <input
                      value={val}
                      onChange={(e) => setValue(item.id, e.target.value)}
                      placeholder="—"
                      spellCheck={false}
                      className={`theme-input w-64 border px-2 py-1 font-mono text-xs uppercase ${
                        rowConflicts
                          ? "!border-red-600"
                          : isDup
                            ? "!border-amber-500"
                            : isEdited
                              ? "!border-sky-500"
                              : ""
                      }`}
                    />
                    {rowConflicts?.map((reason, i) => (
                      <span
                        key={i}
                        className="mt-1 block text-[10px] text-red-500"
                      >
                        {reason}
                      </span>
                    ))}
                    {!rowConflicts && isDup && (
                      <span className="mt-1 block text-[10px] text-amber-500">
                        Bu kod birden çok satırda
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="theme-muted p-6 text-center">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[var(--app-border)] py-3"
        style={{ background: "var(--app-main-bg)" }}
      >
        {duplicateCodes.size > 0 && (
          <span className="text-xs text-amber-500">
            Tekrar eden kodları düzeltin
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changed.length === 0 || duplicateCodes.size > 0}
          className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? "Kaydediliyor…" : `Kaydet (${changed.length})`}
        </button>
      </div>
    </div>
  );
}
