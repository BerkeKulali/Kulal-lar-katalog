"use client";

import { formatSizeLabel } from "@/lib/constants";
import type { PackagingBySize } from "@/lib/family-matrix";

export function FamilyPackagingEditor({
  sizes,
  packaging,
  onChange,
}: {
  sizes: string[];
  packaging: PackagingBySize;
  onChange: (next: PackagingBySize) => void;
}) {
  if (sizes.length === 0) return null;

  function updateSize(
    size: string,
    field: "palletM2" | "boxM2" | "truckM2",
    raw: string
  ) {
    const value = raw === "" ? null : Number(raw);
    onChange({
      ...packaging,
      [size]: {
        ...packaging[size],
        [field]: Number.isFinite(value) && value! > 0 ? value : null,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-zinc-400">Paketleme (m²)</p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Seçili her ölçü için palet, kutu ve tır kapasitesi. Tüm yüzey ve
          kalite satırlarına uygulanır.
        </p>
      </div>
      <div className="space-y-3">
        {sizes.map((size) => {
          const row = packaging[size] ?? {};
          return (
            <div
              key={size}
              className="grid gap-2 border border-zinc-800 p-3 sm:grid-cols-[5rem_1fr_1fr_1fr]"
            >
              <p className="self-center text-xs font-bold tracking-wide text-zinc-300">
                {formatSizeLabel(size)}
              </p>
              <label className="block text-[11px] text-zinc-500">
                Palet m²
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.palletM2 ?? ""}
                  onChange={(e) =>
                    updateSize(size, "palletM2", e.target.value)
                  }
                  placeholder="—"
                  className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-[11px] text-zinc-500">
                Kutu m²
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.boxM2 ?? ""}
                  onChange={(e) => updateSize(size, "boxM2", e.target.value)}
                  placeholder="—"
                  className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-[11px] text-zinc-500">
                Tır m²
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.truckM2 ?? ""}
                  onChange={(e) => updateSize(size, "truckM2", e.target.value)}
                  placeholder="—"
                  className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
