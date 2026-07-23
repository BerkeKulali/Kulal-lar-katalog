"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { COLORS, MATERIAL_TYPES } from "@/lib/product-attributes";

type Brand = { id: string; name: string };

type FamilyRow = {
  id: string;
  name: string;
  brandName: string;
  color: string | null;
  materialType: string | null;
};

type Edit = { color: string | null; materialType: string | null };

export function FamilyAttributesManager({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [q, setQ] = useState("");
  const [onlyUnset, setOnlyUnset] = useState(false);
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [edited, setEdited] = useState<Record<string, Edit>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (q.trim()) params.set("q", q.trim());
    if (onlyUnset) params.set("onlyUnset", "1");
    try {
      const res = await fetch(`/api/admin/family-attributes?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Liste yüklenemedi");
        setRows([]);
      } else {
        setRows(data.items ?? []);
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

  function valueOf(row: FamilyRow): Edit {
    return (
      edited[row.id] ?? { color: row.color, materialType: row.materialType }
    );
  }

  function setField(row: FamilyRow, field: keyof Edit, value: string) {
    const current = valueOf(row);
    setEdited((prev) => ({
      ...prev,
      [row.id]: { ...current, [field]: value || null },
    }));
  }

  const changed = useMemo(() => {
    return rows.filter((row) => {
      const e = edited[row.id];
      if (!e) return false;
      return e.color !== row.color || e.materialType !== row.materialType;
    });
  }, [rows, edited]);

  async function handleSave() {
    if (changed.length === 0) return;
    setSaving(true);
    setMessage(null);
    const entries = changed.map((row) => {
      const e = valueOf(row);
      return { familyId: row.id, color: e.color, materialType: e.materialType };
    });
    try {
      const res = await fetch("/api/admin/family-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Kaydedilemedi");
      } else {
        setMessage(`${data.saved} ürün güncellendi`);
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

  const setCount = rows.filter((r) => r.color || r.materialType).length;

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
          placeholder="Ürün adı ara"
          className="theme-input min-w-[12rem] flex-1 border px-3 py-2 text-sm"
        />
        <label className="theme-muted flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={onlyUnset}
            onChange={(e) => setOnlyUnset(e.target.checked)}
          />
          Eksik olanlar
        </label>
        <button type="submit" className="theme-button border px-4 py-2 text-sm">
          Filtrele
        </button>
      </form>

      <div className="theme-muted flex items-center justify-between text-xs">
        <span>
          {loading ? "Yükleniyor…" : `${rows.length} ürün · ${setCount} tanımlı`}
        </span>
        <span>{changed.length > 0 && `${changed.length} değişiklik`}</span>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Renk</th>
              <th className="p-3">Tip</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const v = valueOf(row);
              const isEdited = row.id in edited;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--app-border)] ${
                    isEdited ? "bg-sky-500/5" : ""
                  }`}
                >
                  <td className="theme-muted p-3">{row.brandName}</td>
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">
                    <select
                      value={v.color ?? ""}
                      onChange={(e) => setField(row, "color", e.target.value)}
                      className="theme-select border px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {COLORS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={v.materialType ?? ""}
                      onChange={(e) =>
                        setField(row, "materialType", e.target.value)
                      }
                      className="theme-select border px-2 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {MATERIAL_TYPES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="theme-muted p-6 text-center">
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
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changed.length === 0}
          className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? "Kaydediliyor…" : `Kaydet (${changed.length})`}
        </button>
      </div>
    </div>
  );
}
