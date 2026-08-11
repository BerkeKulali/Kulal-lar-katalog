"use client";

import { useEffect, useState } from "react";

type Brand = {
  id: string;
  name: string;
  slug: string;
  isVisible: boolean;
  visibleToDealers: boolean;
};

/** Admin panelinde marka bazlı katalog görünürlüğü (herkese / bayilere) kontrolü. */
export function BrandVisibilityManager() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/brands")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setBrands(data.brands ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Markalar yüklenemedi");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function update(id: string, patch: Partial<Pick<Brand, "isVisible" | "visibleToDealers">>) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Güncellenemedi");
        return;
      }
      setBrands((prev) =>
        prev?.map((b) => (b.id === id ? { ...b, ...data.brand } : b)) ?? prev
      );
    } catch {
      setError("Güncellenemedi");
    } finally {
      setSavingId(null);
    }
  }

  if (!brands) {
    return <p className="text-xs text-zinc-500">Yükleniyor...</p>;
  }

  return (
    <div className="border border-zinc-800">
      {error && (
        <p className="border-b border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
          {error}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="p-3 font-normal">Marka</th>
            <th className="p-3 font-normal">Herkese görünür</th>
            <th className="p-3 font-normal">Bayilere görünür</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => {
            const saving = savingId === brand.id;
            return (
              <tr key={brand.id} className="border-b border-zinc-800 last:border-0">
                <td className="p-3 font-semibold">{brand.name}</td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => update(brand.id, { isVisible: !brand.isVisible })}
                    className={`border px-3 py-1.5 text-xs disabled:opacity-40 ${
                      brand.isVisible
                        ? "border-emerald-700 text-emerald-400"
                        : "border-amber-700 text-amber-400"
                    }`}
                  >
                    {brand.isVisible ? "Açık" : "Kapalı"}
                  </button>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={saving || !brand.isVisible}
                    onClick={() =>
                      update(brand.id, { visibleToDealers: !brand.visibleToDealers })
                    }
                    className={`border px-3 py-1.5 text-xs disabled:opacity-40 ${
                      brand.visibleToDealers
                        ? "border-emerald-700 text-emerald-400"
                        : "border-amber-700 text-amber-400"
                    }`}
                  >
                    {brand.visibleToDealers ? "Açık" : "Kapalı"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
