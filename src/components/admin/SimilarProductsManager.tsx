"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Brand = { id: string; name: string };

type FamilyRow = {
  id: string;
  name: string;
  brandName: string;
  similarCount: number;
};

type SimilarItem = { id: string; name: string; brandName: string };

export function SimilarProductsManager({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<FamilyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams();
    if (brandId) params.set("brandId", brandId);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/admin/similar-families?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Liste yüklenemedi");
        setRows([]);
      } else {
        setRows(data.items ?? []);
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

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

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
        <button type="submit" className="theme-button border px-4 py-2 text-sm">
          Filtrele
        </button>
      </form>

      {message && <p className="text-sm text-amber-500">{message}</p>}

      <div className="theme-muted text-xs">
        {loading ? "Yükleniyor…" : `${rows.length} ürün`}
      </div>

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Benzer ürün</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--app-border)]">
                <td className="theme-muted p-3">{row.brandName}</td>
                <td className="p-3">{row.name}</td>
                <td className="p-3">{row.similarCount}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="theme-button border px-3 py-1.5 text-xs"
                  >
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
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

      {editing && (
        <SimilarEditModal
          family={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SimilarEditModal({
  family,
  onClose,
  onSaved,
}: {
  family: FamilyRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<SimilarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SimilarItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/similar-families/${family.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          setItems(
            (data.items ?? []).map((x: SimilarItem) => ({
              id: x.id,
              name: x.name,
              brandName: x.brandName,
            }))
          );
        } else {
          setError(data.error ?? "Yüklenemedi");
        }
      } catch {
        setError("Yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, [family.id]);

  async function runSearch(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), excludeId: family.id });
      const res = await fetch(`/api/admin/families/search?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const chosen = new Set(items.map((i) => i.id));
      setResults(
        (data.items ?? []).filter((r: SimilarItem) => !chosen.has(r.id))
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function add(item: SimilarItem) {
    setItems((prev) => [...prev, item]);
    setResults((prev) => prev.filter((r) => r.id !== item.id));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/similar-families/${family.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ similarIds: items.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kaydedilemedi");
      } else {
        onSaved();
      }
    } catch {
      setError("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col border border-[var(--app-border)]"
        style={{ background: "var(--app-main-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4">
          <div>
            <p className="text-sm font-semibold">{family.name}</p>
            <p className="theme-muted text-xs">{family.brandName} · benzer ürünler</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-muted text-lg leading-none hover:opacity-70"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

          {loading ? (
            <p className="theme-muted text-sm">Yükleniyor…</p>
          ) : (
            <>
              <p className="theme-muted mb-2 text-xs">Eklenmiş benzer ürünler</p>
              {items.length === 0 ? (
                <p className="theme-muted text-sm">Henüz benzer ürün yok.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span
                      key={item.id}
                      className="flex items-center gap-2 border border-[var(--app-border)] px-2 py-1 text-xs"
                    >
                      {item.name}
                      <span className="theme-muted text-[10px]">
                        {item.brandName}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="text-red-500 hover:opacity-70"
                        aria-label="Kaldır"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form onSubmit={runSearch} className="mt-5 flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Benzer ürün ara (ör. Nomerless Beige)"
                  className="theme-input flex-1 border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="theme-button border px-4 py-2 text-sm"
                >
                  Ara
                </button>
              </form>

              <div className="mt-2 space-y-1">
                {searching && (
                  <p className="theme-muted text-xs">Aranıyor…</p>
                )}
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => add(r)}
                    className="flex w-full items-center justify-between border border-[var(--app-border)] px-3 py-2 text-left text-xs hover:opacity-80"
                  >
                    <span>{r.name}</span>
                    <span className="theme-muted">{r.brandName} · ekle +</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--app-border)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="theme-muted px-3 py-2 text-sm hover:opacity-70"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
