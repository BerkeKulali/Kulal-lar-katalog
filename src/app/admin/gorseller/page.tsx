"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TileImage } from "@/components/TileImage";
import { apiErrorMessage, readApiJson } from "@/lib/api-client";
import { optimizeCatalogImage } from "@/lib/image-url";
import { aspectForSize } from "@/lib/constants";
import { sizeUsesDistinctImage } from "@/lib/product-image";

type Brand = { id: string; name: string; slug: string };
type Family = {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  imageUrl: string | null;
  variants: {
    id: string;
    size: string;
    surface: string;
    quality: string;
    imageUrl: string | null;
  }[];
};
type CloudItem = {
  publicId: string;
  url: string;
  displayName: string;
  width: number | null;
  height: number | null;
};

type AssignTarget = "family" | "size" | "variant";

export default function AdminImagesPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [brandSlug, setBrandSlug] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [size, setSize] = useState("");
  const [variantId, setVariantId] = useState("");
  const [assignTarget, setAssignTarget] = useState<AssignTarget>("family");
  const [libraryScope, setLibraryScope] = useState<"auto" | "brand">("auto");
  const [library, setLibrary] = useState<CloudItem[]>([]);
  const [libraryMeta, setLibraryMeta] = useState<{
    prefix: string;
    matchMode: string;
    familyName: string | null;
  } | null>(null);
  const [selected, setSelected] = useState<CloudItem | null>(null);
  const [configured, setConfigured] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<{
    ok: boolean;
    message: string;
    imageCount?: number;
    cloudName?: string;
  } | null>(null);
  const [loadingLib, setLoadingLib] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didInitBrand = useRef(false);

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === familyId) ?? null,
    [families, familyId]
  );

  const sizesForFamily = useMemo(() => {
    if (!selectedFamily) return [];
    return [...new Set(selectedFamily.variants.map((v) => v.size))].sort();
  }, [selectedFamily]);

  const familySlug = selectedFamily?.slug ?? "";

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/admin/catalog-meta");
    if (!res.ok) return;
    const data = await res.json();
    setBrands(data.brands ?? []);
    setFamilies(data.families ?? []);
    if (!didInitBrand.current && data.brands?.[0]) {
      didInitBrand.current = true;
      setBrandSlug(data.brands[0].slug);
    }
  }, []);

  const checkCloudinary = useCallback(async () => {
    const res = await fetch("/api/admin/cloudinary/status");
    const data = await res.json();
    setConfigured(data.configured !== false);
    setCloudStatus({
      ok: Boolean(data.ok),
      message: data.message ?? "",
      imageCount: data.imageCount,
      cloudName: data.cloudName,
    });
  }, []);

  const loadLibrary = useCallback(async () => {
    setLoadingLib(true);
    setError(null);
    const params = new URLSearchParams({ limit: "48", scope: libraryScope });
    if (brandSlug) params.set("brand", brandSlug);
    if (familySlug) params.set("family", familySlug);

    const res = await fetch(`/api/admin/images?${params}`);
    const data = await res.json();
    setLoadingLib(false);

    if (!res.ok) {
      setError(data.error ?? "Kütüphane yüklenemedi");
      setLibraryMeta(null);
      return;
    }

    setConfigured(data.configured !== false);
    setLibrary(data.items ?? []);
    setLibraryMeta({
      prefix: data.prefix ?? "",
      matchMode: data.matchMode ?? "folder",
      familyName: data.familyName ?? null,
    });
  }, [brandSlug, familySlug, libraryScope]);

  useEffect(() => {
    loadMeta();
    checkCloudinary();
  }, [loadMeta, checkCloudinary]);

  useEffect(() => {
    setLibraryScope("auto");
  }, [brandSlug, familyId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const brandFamilies = useMemo(() => {
    const brand = brands.find((b) => b.slug === brandSlug);
    if (!brand) return [];
    return families.filter((f) => f.brandId === brand.id);
  }, [brands, brandSlug, families]);

  useEffect(() => {
    if (familyId && !brandFamilies.some((f) => f.id === familyId)) {
      setFamilyId("");
    }
  }, [brandFamilies, familyId]);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!brandSlug) {
      setError("Önce marka seçin");
      return;
    }

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("brandSlug", brandSlug);
    if (selectedFamily) fd.append("familySlug", selectedFamily.slug);

    const res = await fetch("/api/admin/images", { method: "POST", body: fd });
    const { data, raw } = await readApiJson<CloudItem & { error?: string }>(res);
    setUploading(false);

    if (!res.ok || !data) {
      setError(apiErrorMessage(res, data, raw));
      return;
    }

    setSelected(data);
    setMessage("Görsel Cloudinary'e yüklendi.");
    fileInput.value = "";
    loadLibrary();
  }

  async function handleAssign() {
    if (!selected || !familyId) {
      setError("Görsel ve ürün seçin");
      return;
    }

    setAssigning(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/images/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: assignTarget,
        familyId,
        variantId: assignTarget === "variant" ? variantId : undefined,
        size: assignTarget === "size" ? size : undefined,
        imageUrl: selected.url,
        imagePublicId: selected.publicId,
      }),
    });

    const { data, raw } = await readApiJson<{ updated?: number | string; error?: string }>(
      res
    );
    setAssigning(false);

    if (!res.ok || !data) {
      setError(apiErrorMessage(res, data, raw));
      return;
    }

    setMessage(`Görsel atandı (${data.updated} kayıt güncellendi).`);
    loadMeta();
  }

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Görsel Yönetimi</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Cloudinary CDN — kalıcı bulut depolama
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/admin/aileler"
            className="text-xs text-zinc-500 hover:text-white"
          >
            + Yeni aile
          </Link>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>

      {!configured && (
        <div className="mb-6 border border-amber-800 bg-amber-950/40 px-4 py-4 text-sm text-amber-200">
          <p className="font-semibold">Cloudinary bağlı değil</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-amber-100/90">
            <li>
              <a
                href="https://console.cloudinary.com/settings/api-keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                console.cloudinary.com
              </a>
              {" "}→ API Keys sayfasını açın
            </li>
            <li>
              <code className="text-amber-50">kulalilar-katalog/.env</code>{" "}
              dosyasına Cloud name, API Key ve API Secret yapıştırın
            </li>
            <li>
              Terminalde: <code className="text-amber-50">npm run dev</code>{" "}
              yeniden başlatın
            </li>
            <li>
              Test: <code className="text-amber-50">npm run cloudinary:test</code>
            </li>
          </ol>
        </div>
      )}

      {configured && cloudStatus && (
        <div
          className={`mb-6 border px-4 py-3 text-sm ${
            cloudStatus.ok
              ? "border-green-800 bg-green-950/40 text-green-200"
              : "border-red-800 bg-red-950/40 text-red-200"
          }`}
        >
          <p>{cloudStatus.message}</p>
          {cloudStatus.ok && cloudStatus.cloudName && (
            <p className="mt-1 text-xs opacity-80">Hesap: {cloudStatus.cloudName}</p>
          )}
          {!cloudStatus.ok && (
            <button
              type="button"
              onClick={checkCloudinary}
              className="mt-2 text-xs underline"
            >
              Tekrar dene
            </button>
          )}
        </div>
      )}

      {configured && !cloudStatus && (
        <div className="mb-6 border border-zinc-800 px-4 py-3 text-sm text-zinc-500">
          Cloudinary durumu kontrol ediliyor...
        </div>
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-6 border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">1. Yükle</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Marka</label>
              <select
                value={brandSlug}
                onChange={(e) => {
                  setBrandSlug(e.target.value);
                  setFamilyId("");
                }}
                className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
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
                Ürün ailesi (klasör)
              </label>
              <select
                value={familyId}
                onChange={(e) => setFamilyId(e.target.value)}
                className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
              >
                <option value="">— Seçin —</option>
                {brandFamilies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm"
            />
            <button
              type="submit"
              disabled={uploading || !configured}
              className="w-full border border-white py-2 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
            >
              {uploading ? "Yükleniyor..." : "Cloudinary'e yükle"}
            </button>
          </form>

          <h2 className="pt-2 text-sm font-semibold">2. Ürüne ata</h2>
          <div className="space-y-3">
            <select
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value as AssignTarget)}
              className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
            >
              <option value="family">Liste görseli (aile — 20x120 hariç)</option>
              <option value="size">Bu ölçünün tüm varyantları</option>
              <option value="variant">Tek variant</option>
            </select>

            {assignTarget === "size" && (
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
              >
                <option value="">Ölçü seçin</option>
                {sizesForFamily.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                    {sizeUsesDistinctImage(s) ? " · ayrı görsel" : ""}
                  </option>
                ))}
              </select>
            )}

            {assignTarget === "size" && sizeUsesDistinctImage(size) && (
              <p className="text-xs text-amber-200/90">
                {size.toUpperCase()} şerit formatıdır — 60x120 aile görselinden
                bağımsız, bu ölçüye özel fotoğraf atayın.
              </p>
            )}

            {assignTarget === "variant" && (
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
              >
                <option value="">Variant seçin</option>
                {selectedFamily?.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.size.toUpperCase()} · {v.surface} ·{" "}
                    {v.quality === "FIRST" ? "1." : "END"}
                  </option>
                ))}
              </select>
            )}

            {selected && (
              <div className="max-w-xs">
                <TileImage
                  variant="plain"
                  src={selected.url}
                  alt={selected.displayName}
                  aspect={
                    size ? aspectForSize(size) : "2/1"
                  }
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || !selected || !familyId}
              className="w-full border border-white py-2 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
            >
              {assigning ? "Kaydediliyor..." : "Seçili görseli ata"}
            </button>
          </div>

          {message && <p className="text-sm text-green-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>

        <section className="border border-zinc-800 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Kütüphane</h2>
            {familySlug && (
              <button
                type="button"
                onClick={() =>
                  setLibraryScope((s) => (s === "brand" ? "auto" : "brand"))
                }
                className="text-[11px] text-zinc-400 underline hover:text-white"
              >
                {libraryScope === "brand"
                  ? "Aileye göre ara"
                  : "Tüm marka görselleri"}
              </button>
            )}
          </div>

          {selectedFamily && (
            <p className="mb-3 text-[11px] text-zinc-500">
              Beklenen klasör:{" "}
              <code className="text-zinc-300">
                kulalilar-katalog/{brandSlug}/{selectedFamily.slug}
              </code>
            </p>
          )}

          {libraryMeta?.matchMode === "fuzzy" && library.length > 0 && (
            <p className="mb-3 text-[11px] text-amber-200/90">
              Görseller tam klasörde değil; isim benzerliğiyle marka altında
              bulundu.
            </p>
          )}

          {loadingLib ? (
            <p className="text-sm text-zinc-500">Yükleniyor...</p>
          ) : library.length === 0 ? (
            <div className="space-y-2 text-sm text-zinc-500">
              <p>Bu klasörde görsel yok.</p>
              {selectedFamily && (
                <p className="text-xs">
                  Cloudinary&apos;deki public_id içinde &quot;{selectedFamily.name}
                  &quot; geçmeli veya dosyayı yukarıdan doğru aile klasörüne
                  yükleyin.
                </p>
              )}
            </div>
          ) : (
            <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {library.map((item) => (
                <button
                  key={item.publicId}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`border p-1 text-left transition ${
                    selected?.publicId === item.publicId
                      ? "border-white"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={optimizeCatalogImage(item.url, 280)}
                    alt={item.displayName}
                    className="aspect-[2/1] w-full object-cover"
                  />
                  <p className="mt-1 truncate text-[10px] text-zinc-400">
                    {item.displayName}
                  </p>
                  <p className="truncate text-[9px] text-zinc-600">
                    {item.publicId}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
