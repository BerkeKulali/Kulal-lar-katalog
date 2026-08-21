"use client";

import { COLORS, MATERIAL_TYPES } from "@/lib/product-attributes";

export type SearchFilterOption = { id: string; label: string };

/** Arama sayfası tip/renk/ebat/marka filtre çipleri. Her boyut tek seçim; tekrar tıkla = kaldır. */
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
    <div className="mt-3 space-y-3 px-5">
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

      <div>
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
          RENK
        </p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const active = color === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onColor(active ? null : c.id)}
                className={`catalog-size-chip catalog-filter-chip inline-flex items-center gap-1.5 ${active ? "catalog-size-chip--active" : ""}`}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full border border-black/20"
                  style={{ background: c.hex }}
                />
                {c.label}
              </button>
            );
          })}
        </div>
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

      {sizeOptions.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.2em] text-zinc-500">
            EBAT
          </p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((s) => {
              const active = size === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSize(active ? null : s.id)}
                  className={`catalog-size-chip catalog-filter-chip ${active ? "catalog-size-chip--active" : ""}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
