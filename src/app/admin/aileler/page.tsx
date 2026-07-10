"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FamilySurfaceEditor } from "@/components/admin/FamilySurfaceEditor";
import { FamilyFeaturesEditor } from "@/components/admin/FamilyFeaturesEditor";
import { FamilyPackagingEditor } from "@/components/admin/FamilyPackagingEditor";
import { AppShell } from "@/components/AppShell";
import {
  countMatrixVariants,
  matrixFromUniform,
  matrixSizes,
  prunePackaging,
  type PackagingBySize,
  type SurfaceMatrix,
} from "@/lib/family-matrix";
import { getSurfacesForBrand } from "@/lib/constants";
import { DEFAULT_PRODUCT_FEATURES, type ProductFeatureFlags } from "@/lib/product-features";
import { GURAL_PACKAGING_BY_SIZE } from "@/lib/gural-packaging";
import { slugify } from "@/lib/utils";

type Brand = { id: string; name: string; slug: string };
type FamilyRow = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
  variantCount: number;
  isActive: boolean;
};

type SurfaceMode = "uniform" | "perSize";

const DEFAULT_SIZES = ["60x120", "60x60", "80x80"];
const DEFAULT_SURFACES = ["MAT", "SLP", "FLP"];
const CREATE_PACKAGING_DEFAULTS: Record<string, PackagingBySize> = {
  gural: GURAL_PACKAGING_BY_SIZE,
};

function applyCreatePackagingDefaults(
  brandSlug: string,
  sizes: string[],
  packaging: PackagingBySize
) {
  const pruned = prunePackaging(packaging, sizes);
  const defaults = CREATE_PACKAGING_DEFAULTS[brandSlug];
  if (!defaults) return pruned;

  const next: PackagingBySize = { ...pruned };
  for (const size of sizes) {
    const sizeDefaults = defaults[size];
    if (!sizeDefaults) continue;

    const row = next[size] ?? {};
    next[size] = {
      palletM2: row.palletM2 ?? sizeDefaults.palletM2 ?? null,
      boxM2: row.boxM2 ?? sizeDefaults.boxM2 ?? null,
      truckM2: row.truckM2 ?? sizeDefaults.truckM2 ?? null,
    };
  }

  return next;
}

function buildPayloadMatrix(
  brandSlug: string,
  mode: SurfaceMode,
  sizes: string[],
  uniformSurfaces: string[],
  matrix: SurfaceMatrix
): SurfaceMatrix {
  if (mode === "perSize") {
    const allowed = new Set(getSurfacesForBrand(brandSlug));
    const result: SurfaceMatrix = {};
    for (const size of sizes) {
      const surfaces = (matrix[size] ?? []).filter((s) => allowed.has(s));
      if (surfaces.length > 0) result[size] = surfaces;
    }
    return result;
  }
  return matrixFromUniform(sizes, uniformSurfaces, brandSlug);
}

export default function AdminFamiliesPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [brandSlug, setBrandSlug] = useState("");
  const [name, setName] = useState("");
  const [createMode, setCreateMode] = useState<SurfaceMode>("uniform");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(DEFAULT_SIZES);
  const [selectedSurfaces, setSelectedSurfaces] =
    useState<string[]>(DEFAULT_SURFACES);
  const [selectedFeatures, setSelectedFeatures] =
    useState<ProductFeatureFlags>(DEFAULT_PRODUCT_FEATURES);
  const [createMatrix, setCreateMatrix] = useState<SurfaceMatrix>({});
  const [createPackaging, setCreatePackaging] = useState<PackagingBySize>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrandSlug, setEditBrandSlug] = useState("");
  const [editMode, setEditMode] = useState<SurfaceMode>("uniform");
  const [editSizes, setEditSizes] = useState<string[]>([]);
  const [editSurfaces, setEditSurfaces] = useState<string[]>([]);
  const [editFeatures, setEditFeatures] =
    useState<ProductFeatureFlags>(DEFAULT_PRODUCT_FEATURES);
  const [editMatrix, setEditMatrix] = useState<SurfaceMatrix>({});
  const [editPackaging, setEditPackaging] = useState<PackagingBySize>({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [familySearch, setFamilySearch] = useState("");
  const didInitBrand = useRef(false);

  const loadData = useCallback(async () => {
    const [brandsRes, listRes] = await Promise.all([
      fetch("/api/admin/brands"),
      fetch("/api/admin/families"),
    ]);

    if (brandsRes.ok) {
      const data = await brandsRes.json();
      setBrands(data.brands ?? []);
      if (!didInitBrand.current && data.brands?.[0]) {
        didInitBrand.current = true;
        setBrandSlug(data.brands[0].slug);
      }
    }

    if (listRes.ok) {
      const list = await listRes.json();
      setFamilies(list.families ?? []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedSurfaces((prev) =>
      prev.filter((s) => getSurfacesForBrand(brandSlug).includes(s))
    );
  }, [brandSlug]);

  const createPayloadMatrix = useMemo(
    () =>
      buildPayloadMatrix(
        brandSlug,
        createMode,
        selectedSizes,
        selectedSurfaces,
        createMatrix
      ),
    [brandSlug, createMode, selectedSizes, selectedSurfaces, createMatrix]
  );

  const previewCount = countMatrixVariants(createPayloadMatrix);

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        f.brandName.toLowerCase().includes(q)
    );
  }, [families, familySearch]);

  const editPayloadMatrix = useMemo(
    () =>
      buildPayloadMatrix(
        editBrandSlug,
        editMode,
        editSizes,
        editSurfaces,
        editMatrix
      ),
    [editBrandSlug, editMode, editSizes, editSurfaces, editMatrix]
  );

  const createPackagingSizes = useMemo(
    () => matrixSizes(createPayloadMatrix),
    [createPayloadMatrix]
  );

  const editPackagingSizes = useMemo(
    () => matrixSizes(editPayloadMatrix),
    [editPayloadMatrix]
  );

  useEffect(() => {
    setCreatePackaging((prev) =>
      applyCreatePackagingDefaults(brandSlug, createPackagingSizes, prev)
    );
  }, [brandSlug, createPackagingSizes]);

  useEffect(() => {
    setEditPackaging((prev) => prunePackaging(prev, editPackagingSizes));
  }, [editPackagingSizes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const matrix = createPayloadMatrix;
    if (Object.keys(matrix).length === 0) {
      setLoading(false);
      setError("En az bir ölçü ve yüzey kombinasyonu seçin");
      return;
    }

    const res = await fetch("/api/admin/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandSlug,
        name,
        matrix,
        packaging: createPackaging,
        features: selectedFeatures,
      }),
    });

    const text = await res.text();
    let data: {
      error?: string;
      family?: { name: string };
      createdVariants?: number;
    } = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        setLoading(false);
        setError("Sunucu yanıtı okunamadı");
        return;
      }
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Kayıt başarısız");
      return;
    }

    if (!data.family?.name) {
      setError("Kayıt yanıtı eksik");
      return;
    }

    setMessage(
      `"${data.family.name}" eklendi — ${data.createdVariants ?? 0} variant oluşturuldu (1. + END otomatik). Fiyat ve stok sonra girilebilir.`
    );
    setName("");
    loadData();
  }

  async function startEdit(familyId: string) {
    setError(null);
    setMessage(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/admin/families/${familyId}`);
      const text = await res.text();
      let data: { error?: string; family?: Record<string, unknown> } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          setEditLoading(false);
          setError("Sunucu yanıtı okunamadı. Dev sunucusunu yeniden başlatın.");
          return;
        }
      }

      setEditLoading(false);

      if (!res.ok) {
        setError(data.error ?? "Ürün yüklenemedi");
        return;
      }

      const f = data.family;
      if (!f) {
        setError("Ürün yüklenemedi");
        return;
      }

      setEditingId(familyId);
      setEditName(String(f.name ?? ""));
      setEditBrandSlug(String(f.brandSlug ?? ""));
      setEditMode(f.surfaceMode === "perSize" ? "perSize" : "uniform");
      setEditSizes((f.sizes as string[]) ?? []);
      setEditSurfaces((f.surfaces as string[]) ?? []);
      setEditFeatures(
        (f.features as ProductFeatureFlags | undefined) ?? DEFAULT_PRODUCT_FEATURES
      );
      setEditMatrix((f.matrix as SurfaceMatrix) ?? {});
      setEditPackaging((f.packaging as PackagingBySize) ?? {});
    } catch {
      setEditLoading(false);
      setError("Bağlantı hatası — sunucu çalışıyor mu?");
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBrandSlug("");
    setEditMode("uniform");
    setEditSizes([]);
    setEditSurfaces([]);
    setEditFeatures(DEFAULT_PRODUCT_FEATURES);
    setEditMatrix({});
    setEditPackaging({});
  }

  async function saveEdit() {
    if (!editingId) return;

    const matrix = editPayloadMatrix;
    if (Object.keys(matrix).length === 0) {
      setError("En az bir ölçü ve yüzey kombinasyonu seçin");
      return;
    }

    setEditLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/families/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        brandSlug: editBrandSlug,
        matrix,
        packaging: editPackaging,
        features: editFeatures,
      }),
    });

    const text = await res.text();
    let data: {
      error?: string;
      family?: { name: string };
      addedVariants?: number;
      removedVariants?: number;
      brandChanged?: boolean;
    } = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        setEditLoading(false);
        setError("Sunucu yanıtı okunamadı");
        return;
      }
    }

    setEditLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Güncelleme başarısız");
      return;
    }

    const parts = [`"${data.family?.name}" güncellendi`];
    if (data.brandChanged) parts.push("marka değiştirildi");
    if (data.addedVariants) parts.push(`${data.addedVariants} variant eklendi`);
    if (data.removedVariants) parts.push(`${data.removedVariants} variant silindi`);
    setMessage(parts.join(" · "));

    cancelEdit();
    loadData();
  }

  async function deleteFamily(family: FamilyRow) {
    const ok = window.confirm(
      `"${family.name}" ürün ailesini ve ${family.variantCount} variantını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
    );
    if (!ok) return;

    setDeleteLoadingId(family.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/families/${family.id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));
    setDeleteLoadingId(null);

    if (!res.ok) {
      setError(data.error ?? "Silme başarısız");
      return;
    }

    if (editingId === family.id) cancelEdit();
    setMessage(`"${family.name}" silindi`);
    loadData();
  }

  async function toggleFamilyStatus(family: FamilyRow) {
    const nextActive = !family.isActive;
    const action = nextActive ? "aktif" : "pasif";

    const ok = window.confirm(
      `"${family.name}" ürün ailesini ${action} yapmak istiyor musunuz?`
    );
    if (!ok) return;

    setStatusLoadingId(family.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/families/${family.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });

    const data = await res.json().catch(() => ({}));
    setStatusLoadingId(null);

    if (!res.ok) {
      setError(data.error ?? "Durum güncellenemedi");
      return;
    }

    setMessage(`"${family.name}" ${action} yapıldı`);
    loadData();
  }

  const previewSlug = name ? slugify(name) : "";

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Yeni ürün ailesi</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Tek kart · tek görsel · ölçü ve yüzey kombinasyonları için otomatik
            variant
          </p>
        </div>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-10 space-y-6 border border-zinc-800 p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Marka *</label>
            <select
              value={brandSlug}
              onChange={(e) => setBrandSlug(e.target.value)}
              className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
              required
            >
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Ürün ailesi adı *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="CARMEN BEIGE"
              className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm uppercase"
              required
            />
            {previewSlug && (
              <p className="mt-1 text-[10px] text-zinc-600">
                Katalogda tek kart: {name || "—"} · Görsel tüm yüzeyler için
                geçerli
              </p>
            )}
          </div>
        </div>

        <FamilySurfaceEditor
          key={brandSlug}
          brandSlug={brandSlug}
          mode={createMode}
          onModeChange={setCreateMode}
          selectedSizes={selectedSizes}
          onSizesChange={setSelectedSizes}
          uniformSurfaces={selectedSurfaces}
          onUniformSurfacesChange={setSelectedSurfaces}
          matrix={createMatrix}
          onMatrixChange={setCreateMatrix}
        />

        <FamilyFeaturesEditor
          features={selectedFeatures}
          onChange={setSelectedFeatures}
        />

        <FamilyPackagingEditor
          sizes={createPackagingSizes}
          packaging={createPackaging}
          onChange={setCreatePackaging}
        />

        <div className="theme-info-box px-4 py-3 text-xs">
          <p>
            Otomatik oluşturulacak:{" "}
            <strong>{previewCount}</strong> variant
          </p>
          <p className="mt-1">
            Her ölçü × yüzey için <strong>1. Kalite</strong> ve{" "}
            <strong>END</strong> ayrı satır olarak açılır.
          </p>
          {createMode === "perSize" && (
            <p className="mt-1">
              Ölçüye göre modda sadece seçtiğiniz kombinasyonlar oluşturulur
              (ör. 60×60 yalnızca MAT).
            </p>
          )}
          <p className="mt-1">
            Fiyat ve stok şimdi girilmez — Excel veya fiyat listesinden sonra
            eklenebilir.
          </p>
        </div>

        {message && <p className="text-sm text-green-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || previewCount === 0}
          className="w-full border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Ürün ailesi oluştur"}
        </button>
      </form>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-zinc-400">
          Mevcut ürün aileleri ({families.length}
          {familySearch.trim() ? ` · ${filteredFamilies.length} eşleşme` : ""})
        </h2>
        <p className="mb-4 text-xs text-zinc-600">
          Düzenle ile ölçü ve yüzey matrisini güncelleyin; ölçüye göre farklı
          yüzeyler için &quot;Ölçüye göre farklı&quot; modunu kullanın.
        </p>
        <input
          type="search"
          value={familySearch}
          onChange={(e) => setFamilySearch(e.target.value)}
          placeholder="Aile ara (Volcano, Crema, MISHA…)"
          className="mb-4 w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
        />
        <div className="overflow-x-auto border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="p-3">Marka</th>
                <th className="p-3">Aile</th>
                <th className="p-3">Variant</th>
                <th className="p-3">Durum</th>
                <th className="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-500">
                    {familySearch.trim()
                      ? "Aramanızla eşleşen aile yok."
                      : "Henüz ürün ailesi yok."}
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((f) => (
                <tr
                  key={f.id}
                  className={`border-b border-zinc-900${f.isActive ? "" : " opacity-60"}`}
                >
                  <td className="p-3">{f.brandName}</td>
                  <td className="p-3 font-semibold">{f.name}</td>
                  <td className="p-3 text-zinc-500">{f.variantCount}</td>
                  <td className="p-3">
                    <span
                      className={
                        f.isActive ? "text-green-400" : "text-zinc-500"
                      }
                    >
                      {f.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFamilyStatus(f)}
                        disabled={
                          statusLoadingId === f.id ||
                          editLoading ||
                          deleteLoadingId === f.id
                        }
                        className="border border-zinc-700 px-2 py-1 hover:border-white disabled:opacity-50"
                      >
                        {statusLoadingId === f.id
                          ? "..."
                          : f.isActive
                            ? "Pasife al"
                            : "Aktif yap"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(f.id)}
                        disabled={
                          editLoading ||
                          deleteLoadingId === f.id ||
                          statusLoadingId === f.id
                        }
                        className="border border-zinc-700 px-2 py-1 hover:border-white disabled:opacity-50"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFamily(f)}
                        disabled={
                          deleteLoadingId === f.id ||
                          editLoading ||
                          statusLoadingId === f.id
                        }
                        className="border border-red-900 px-2 py-1 text-red-400 hover:border-red-500 disabled:opacity-50"
                      >
                        {deleteLoadingId === f.id ? "..." : "Sil"}
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-zinc-700 bg-black p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Ürün ailesini düzenle</h3>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Kapat
              </button>
            </div>

            <div className="space-y-5">
              {error && (
                <p className="border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              {brands.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Marka</label>
                  <select
                    value={editBrandSlug}
                    onChange={(e) => setEditBrandSlug(e.target.value)}
                    className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-zinc-500">Ad</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.toUpperCase())}
                  className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm uppercase"
                />
              </div>

              <FamilySurfaceEditor
                key={editBrandSlug}
                brandSlug={editBrandSlug}
                mode={editMode}
                onModeChange={setEditMode}
                selectedSizes={editSizes}
                onSizesChange={setEditSizes}
                uniformSurfaces={editSurfaces}
                onUniformSurfacesChange={setEditSurfaces}
                matrix={editMatrix}
                onMatrixChange={setEditMatrix}
              />

              <FamilyFeaturesEditor
                features={editFeatures}
                onChange={setEditFeatures}
              />

              <FamilyPackagingEditor
                sizes={editPackagingSizes}
                packaging={editPackaging}
                onChange={setEditPackaging}
              />

              <p className="text-[11px] text-zinc-600">
                Kaldırdığınız ölçü/yüzey kombinasyonlarının variantları silinir.
                Yeni kombinasyonlar için 1. + END otomatik eklenir.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={
                    editLoading ||
                    !editName.trim() ||
                    countMatrixVariants(editPayloadMatrix) === 0
                  }
                  className="flex-1 border border-white py-3 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-50"
                >
                  {editLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="border border-zinc-700 px-4 py-3 text-sm text-zinc-400"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
