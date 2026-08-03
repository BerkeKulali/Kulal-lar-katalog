"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CAMPAIGN_LOCATIONS,
  CAMPAIGN_QUALITY_TAGS,
  CAMPAIGN_SIZE_TAGS,
} from "@/lib/campaign-tags";

type CampaignImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  visibleToDealers: boolean;
  sortOrder: number;
  locationTag: string | null;
  sizeTag: string | null;
  qualityTag: string | null;
  images: CampaignImage[];
};

/**
 * PDF'i tarayıcıda (pdf.js) sayfalara ayırıp her sayfayı PNG File'a çevirir.
 * Sunucu tarafında PDF render pipeline'ı kurmamak için bilinçli tercih —
 * Vercel serverless'ta headless render karmaşık; bu iş istemcide yapılıyor.
 */
async function pdfFileToPngFiles(file: File): Promise<File[]> {
  const pdfjsLib = await import("pdfjs-dist");
  // /public altında pdfjs-dist ile AYNI sürümden kopyalanmış worker dosyası
  // kullanılıyor (CDN'e bağımlı olmamak ve sürüm uyuşmazlığını önlemek için).
  // pdfjs-dist güncellenirse public/pdf-worker/pdf.worker.min.mjs de
  // node_modules/pdfjs-dist/build/pdf.worker.min.mjs ile değiştirilmeli.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf-worker/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const baseName = file.name.replace(/\.pdf$/i, "").trim() || "afis";
  const files: File[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const renderTask = page.render({ canvas, viewport });
      await renderTask.promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG üretilemedi"))),
          "image/png"
        );
      });

      const pageLabel = pdf.numPages > 1 ? `-sayfa-${pageNum}` : "";
      files.push(
        new File([blob], `${baseName}${pageLabel}.png`, { type: "image/png" })
      );
    }
  } finally {
    await loadingTask.destroy();
  }

  return files;
}

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Liste yüklenemedi");
        return;
      }
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Oluşturulamadı");
        return;
      }
      setNewTitle("");
      setNewDescription("");
      await load();
    } catch {
      setError("Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 border border-[var(--app-border)] p-4"
      >
        <div className="flex-1 min-w-[12rem]">
          <label className="theme-muted mb-1 block text-xs">Başlık</label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Örn. Ağustos Kampanyası"
            className="theme-input w-full border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className="theme-muted mb-1 block text-xs">
            Açıklama (opsiyonel)
          </label>
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Kısa açıklama"
            className="theme-input w-full border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newTitle.trim()}
          className="theme-button border px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {creating ? "Oluşturuluyor…" : "Yeni kampanya"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="theme-muted text-xs">Yükleniyor…</p>}

      <div className="space-y-4">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} onChanged={load} />
        ))}
        {!loading && campaigns.length === 0 && (
          <p className="theme-muted text-sm">Henüz kampanya yok.</p>
        )}
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  onChanged,
}: {
  campaign: Campaign;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function patch(data: Record<string, unknown>) {
    setMessage(null);
    const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Güncellenemedi");
      return false;
    }
    await onChanged();
    return true;
  }

  async function handleSave() {
    setSaving(true);
    const ok = await patch({ title: title.trim(), description: description.trim() || null });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`"${campaign.title}" kampanyası silinsin mi?`)) return;
    const res = await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Silinemedi");
      return;
    }
    await onChanged();
  }

  /** Tek dosyayı Cloudinary'ye yükler; hata varsa mesajı gösterir. */
  async function uploadOneFile(file: File): Promise<boolean> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/images`, {
      method: "POST",
      body: form,
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Yükleme başarısız");
      return false;
    }
    return true;
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    setMessage(null);
    setUploadProgress(null);
    try {
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name);

      if (!isPdf) {
        await uploadOneFile(file);
        await onChanged();
        return;
      }

      setUploadProgress("PDF sayfalara ayrılıyor…");
      const pages = await pdfFileToPngFiles(file);
      for (let i = 0; i < pages.length; i++) {
        setUploadProgress(`Sayfa ${i + 1}/${pages.length} yükleniyor…`);
        const ok = await uploadOneFile(pages[i]!);
        if (!ok) break;
      }
      await onChanged();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `PDF işlenemedi: ${err.message}`
          : "PDF işlenemedi"
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(imageId: string) {
    const res = await fetch(`/api/admin/campaigns/${campaign.id}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Görsel silinemedi");
      return;
    }
    await onChanged();
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const images = [...campaign.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    [images[index], images[target]] = [images[target], images[index]];

    const res = await fetch(`/api/admin/campaigns/${campaign.id}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds: images.map((img) => img.id) }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Sıralama güncellenemedi");
      return;
    }
    await onChanged();
  }

  const sortedImages = [...campaign.images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="border border-[var(--app-border)] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[14rem]">
          {editing ? (
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="theme-input w-full border px-3 py-2 text-sm"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Açıklama"
                className="theme-input w-full border px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <>
              <p className="font-semibold">{campaign.title}</p>
              {campaign.description && (
                <p className="theme-muted text-xs">{campaign.description}</p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={campaign.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
            />
            Aktif
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={campaign.visibleToDealers}
              onChange={(e) => patch({ visibleToDealers: e.target.checked })}
            />
            Bayilere görünür
          </label>
          {editing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="theme-button border px-3 py-1.5 disabled:opacity-40"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="theme-button border px-3 py-1.5"
            >
              Düzenle
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="border border-red-800 px-3 py-1.5 text-red-500 hover:bg-red-950/40"
          >
            Sil
          </button>
        </div>
      </div>

      {message && <p className="mb-2 text-xs text-red-500">{message}</p>}

      <div className="mb-3 flex flex-wrap items-end gap-3 border border-dashed border-[var(--app-border)] p-3">
        <div>
          <label className="theme-muted mb-1 block text-[10px]">
            Lokasyon rozeti
          </label>
          <select
            value={campaign.locationTag ?? ""}
            onChange={(e) => patch({ locationTag: e.target.value || null })}
            className="theme-input border px-2 py-1.5 text-xs"
          >
            <option value="">—</option>
            {CAMPAIGN_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-muted mb-1 block text-[10px]">
            Ebat rozeti
          </label>
          <select
            value={campaign.sizeTag ?? ""}
            onChange={(e) => patch({ sizeTag: e.target.value || null })}
            className="theme-input border px-2 py-1.5 text-xs"
          >
            <option value="">—</option>
            {CAMPAIGN_SIZE_TAGS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="theme-muted mb-1 block text-[10px]">
            Kalite rozeti
          </label>
          <select
            value={campaign.qualityTag ?? ""}
            onChange={(e) => patch({ qualityTag: e.target.value || null })}
            className="theme-input border px-2 py-1.5 text-xs"
          >
            <option value="">—</option>
            {CAMPAIGN_QUALITY_TAGS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>
        <p className="theme-muted w-full text-[10px]">
          Bu üçü kampanya kartında yuvarlak rozet olarak gösterilir; boş
          bırakılan rozet hiç görünmez.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        {sortedImages.map((img, index) => (
          <div key={img.id} className="relative w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt=""
              className="h-40 w-32 border border-[var(--app-border)] object-cover"
            />
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0}
                  className="theme-button border px-1.5 disabled:opacity-30"
                  title="Sola/yukarı taşı"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === sortedImages.length - 1}
                  className="theme-button border px-1.5 disabled:opacity-30"
                  title="Sağa/aşağı taşı"
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteImage(img.id)}
                className="text-red-500 hover:underline"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
        className="block text-xs"
      />
      {uploading && (
        <p className="theme-muted mt-1 text-xs">
          {uploadProgress ?? "Yükleniyor…"}
        </p>
      )}
      <p className="theme-muted mt-2 text-[10px]">
        Afişi doğrudan PDF olarak yükleyebilirsiniz — sayfalar otomatik olarak
        görsele çevrilip sırayla eklenir. İsterseniz PNG/JPG olarak dışa
        aktarıp tek tek de yükleyebilirsiniz; sıralama katalogdaki galeri
        sırasını belirler.
      </p>
    </div>
  );
}
