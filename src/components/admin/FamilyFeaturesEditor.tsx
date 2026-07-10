"use client";

import type { ProductFeatureFlags } from "@/lib/product-features";

type FamilyFeaturesEditorProps = {
  features: ProductFeatureFlags;
  onChange: (features: ProductFeatureFlags) => void;
};

function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`border px-3 py-2 text-left text-xs ${
        checked
          ? "border-white bg-white text-black"
          : "border-zinc-700 text-zinc-400"
      }`}
    >
      <span className="font-semibold">{label}</span>
      <span className="mt-0.5 block text-[10px] font-normal opacity-80">
        {description}
      </span>
    </button>
  );
}

export function FamilyFeaturesEditor({
  features,
  onChange,
}: FamilyFeaturesEditorProps) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-zinc-400">
        Ek özellikler (yüzeyle birlikte)
      </p>
      <p className="mb-2 text-[10px] text-zinc-600">
        MAT, SLP gibi yüzeylerden bağımsızdır. Seçiliyse bu ailedeki tüm
        varyantlara uygulanır.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <FeatureToggle
          label="3D"
          description="Üç boyutlu doku"
          checked={features.feature3D}
          onChange={(feature3D) => onChange({ ...features, feature3D })}
        />
        <FeatureToggle
          label="REC"
          description="Rektifiye"
          checked={features.featureRec}
          onChange={(featureRec) => onChange({ ...features, featureRec })}
        />
      </div>
    </div>
  );
}
