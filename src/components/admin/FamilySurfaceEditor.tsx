"use client";

import { getSizesForBrand, getSurfaceOptionsForBrand } from "@/lib/constants";
import type { SurfaceMatrix } from "@/lib/family-matrix";

type FamilySurfaceEditorProps = {
  brandSlug: string;
  mode: "uniform" | "perSize";
  onModeChange: (mode: "uniform" | "perSize") => void;
  selectedSizes: string[];
  onSizesChange: (sizes: string[]) => void;
  uniformSurfaces: string[];
  onUniformSurfacesChange: (surfaces: string[]) => void;
  matrix: SurfaceMatrix;
  onMatrixChange: (matrix: SurfaceMatrix) => void;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

export function FamilySurfaceEditor({
  brandSlug,
  mode,
  onModeChange,
  selectedSizes,
  onSizesChange,
  uniformSurfaces,
  onUniformSurfacesChange,
  matrix,
  onMatrixChange,
}: FamilySurfaceEditorProps) {
  const surfaceOptions = getSurfaceOptionsForBrand(brandSlug);
  const sizeOptions = getSizesForBrand(brandSlug);

  function switchMode(next: "uniform" | "perSize") {
    if (next === mode) return;

    if (next === "perSize") {
      const nextMatrix: SurfaceMatrix = {};
      for (const size of selectedSizes) {
        nextMatrix[size] = matrix[size]?.length
          ? [...matrix[size]]
          : [...uniformSurfaces];
      }
      onMatrixChange(nextMatrix);
    } else {
      const surfaces =
        selectedSizes.length > 0 && matrix[selectedSizes[0]]?.length
          ? [...matrix[selectedSizes[0]]]
          : [...uniformSurfaces];
      onUniformSurfacesChange(surfaces);
    }

    onModeChange(next);
  }

  function toggleSize(size: string) {
    const nextSizes = toggle(selectedSizes, size);
    onSizesChange(nextSizes);

    if (mode === "perSize") {
      const nextMatrix = { ...matrix };
      if (nextSizes.includes(size)) {
        if (!nextMatrix[size]?.length) {
          nextMatrix[size] = [...uniformSurfaces];
        }
      } else {
        delete nextMatrix[size];
      }
      onMatrixChange(nextMatrix);
    }
  }

  function toggleMatrixSurface(size: string, surface: string) {
    const current = matrix[size] ?? [];
    const next = toggle(current, surface);
    onMatrixChange({ ...matrix, [size]: next });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => switchMode("uniform")}
          className={`border px-3 py-2 text-left text-xs ${
            mode === "uniform"
              ? "border-white bg-white text-black"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          Tüm ölçülerde aynı yüzeyler
        </button>
        <button
          type="button"
          onClick={() => switchMode("perSize")}
          className={`border px-3 py-2 text-left text-xs ${
            mode === "perSize"
              ? "border-white bg-white text-black"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          Ölçüye göre farklı yüzeyler
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-zinc-400">Ölçüler *</p>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`border px-3 py-2 text-xs font-semibold ${
                selectedSizes.includes(s)
                  ? "border-white bg-white text-black"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {mode === "uniform" ? (
        <div>
          <p className="mb-2 text-xs font-semibold text-zinc-400">
            Yüzeyler (tüm seçili ölçüler için) *
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {surfaceOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUniformSurfacesChange(toggle(uniformSurfaces, opt.id))
                }
                className={`border px-3 py-2 text-left text-xs ${
                  uniformSurfaces.includes(opt.id)
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-400">
            Her ölçü için yüzey seçin *
          </p>
          {selectedSizes.length === 0 ? (
            <p className="text-xs text-zinc-600">Önce en az bir ölçü seçin.</p>
          ) : (
            selectedSizes.map((size) => (
              <div
                key={size}
                className="border border-zinc-800 px-3 py-3"
              >
                <p className="mb-2 text-xs font-bold tracking-wider">
                  {size.toUpperCase()}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {surfaceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleMatrixSurface(size, opt.id)}
                      className={`border px-3 py-2 text-left text-xs ${
                        (matrix[size] ?? []).includes(opt.id)
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
