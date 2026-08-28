"use client";

import { COLORS, MATERIAL_TYPES } from "@/lib/product-attributes";

export type SearchFilterOption = { id: string; label: string };

const SELECT_CLASS =
  "theme-select w-full rounded-lg border px-3 py-2 text-sm";

/**
 * Arama sayfası filtreleri. TİP ve MARKA (kısa listeler) çip olarak kalır;
 * RENK (12) ve EBAT (17'ye kadar) aşağı açılır menü — hepsi çip olunca
 * arama kutusunun altı sonuç görünmeden önce kalabalık bir duvara
 * dönüşüyordu. Her boyut tek seçim; "Tümü" = filtreyi kaldır.
 */
export function SearchFilterChips({
  color,
  materialType,
  size,
  brandSlug,
  sizeOptions,
  brandOptions,
  onColor,
  onMaterialType,
  onSize,
  onBrandSlug,
}: {
  color: string | null;
  materialType: string | null;
  size: string | null;
  brandSlug: string | null;
  /** Katalogda gerçekten var olan ölçüler (doğru sırayla) — arama sonuçlarından türetilir. */
  sizeOptions: SearchFilterOption[];
  /** Katalogda gerçekten var olan markalar — arama sonuçlarından türetilir. */
  brandOptions: SearchFilterOption[];
  onColor: (id: string | null) => void;
  onMaterialType: (id: string | null) => void;
  onSize: (id: string | null) => void;
  onBrandSlug: (id: string | null) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
          TİP
        </p>
        <div className="flex flex-wrap gap-2">
          {MATERIAL_TYPES.map((m) => {
            const active = materialType === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onMaterialType(active ? null : m.id)}
                className={`catalog-size-chip catalog-filter-chip ${active ? "catalog-size-chip--active" : ""}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="search-filter-renk"
            className="mb-1.5 block text-[10px] font-semibold tracking-[0.2em] text-zinc-500"
          >
            RENK
          </label>
          <select
            id="search-filter-renk"
            value={color ?? ""}
            onChange={(e) => onColor(e.target.value || null)}
            className={SELECT_CLASS}
          >
            <option value="">Tümü</option>
            {COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {sizeOptions.length > 0 && (
          <div>
            <label
              htmlFor="search-filter-ebat"
              className="mb-1.5 block text-[10px] font-semibold tracking-[0.2em] text-zinc-500"
            >
              EBAT
            </label>
            <select
              id="search-filter-ebat"
              value={size ?? ""}
              onChange={(e) => onSize(e.target.value || null)}
              className={SELECT_CLASS}
            >
              <option value="">Tümü</option>
              {sizeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {brandOptions.length > 1 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
            MARKA
          </p>
          <div className="flex flex-wrap gap-2">
            {brandOptions.map((b) => {
              const active = brandSlug === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBrandSlug(active ? null : b.id)}
                  className={`catalog-size-chip catalog-filter-chip ${active ? "catalog-size-chip--active" : ""}`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
