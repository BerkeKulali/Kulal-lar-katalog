"use client";

import { COLORS, MATERIAL_TYPES } from "@/lib/product-attributes";

/** Arama sayfası renk/tip filtre çipleri. Her boyut tek seçim; tekrar tıkla = kaldır. */
export function SearchFilterChips({
  color,
  materialType,
  onColor,
  onMaterialType,
}: {
  color: string | null;
  materialType: string | null;
  onColor: (id: string | null) => void;
  onMaterialType: (id: string | null) => void;
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
    </div>
  );
}
