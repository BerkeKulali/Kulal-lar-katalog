"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  isActive: boolean;
  sortOrder: number;
  brand: { id: string; name: string } | null;
  updatedAt: string;
};

async function readJsonSafe(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Sunucu hatası (${res.status})` };
  }
}

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(data.error ?? "Liste yüklenemedi");
        return;
      }
      setAnnouncements((data.announcements as Announcement[] | undefined) ?? []);
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
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          body: newBody.trim() || null,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        setError(data.error ?? "Oluşturulamadı");
        return;
      }
      setNewTitle("");
      setNewBody("");
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
            placeholder="Örn. QUA fiyat listesi güncellendi"
            className="theme-input w-full border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className="theme-muted mb-1 block text-xs">
            Metin (opsiyonel)
          </label>
          <input
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Kısa açıklama"
            className="theme-input w-full border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newTitle.trim()}
          className="theme-button border px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {creating ? "Oluşturuluyor…" : "Yeni duyuru"}
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="theme-muted text-xs">Yükleniyor…</p>}

      <div className="space-y-3">
        {announcements.map((a) => (
          <AnnouncementCard key={a.id} announcement={a} onChanged={load} />
        ))}
        {!loading && announcements.length === 0 && (
          <p className="theme-muted text-sm">Henüz duyuru yok.</p>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onChanged,
}: {
  announcement: Announcement;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await readJsonSafe(res);
      if (!res.ok) {
        setError(json.error ?? "Güncellenemedi");
        return;
      }
      setEditing(false);
      await onChanged();
    } catch {
      setError("Güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${announcement.title}" duyurusu silinsin mi?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: "DELETE",
      });
      const json = await readJsonSafe(res);
      if (!res.ok) {
        setError(json.error ?? "Silinemedi");
        return;
      }
      await onChanged();
    } catch {
      setError("Silinemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-[var(--app-border)] p-4">
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="theme-muted mb-1 block text-[10px]">Başlık</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="theme-input w-full border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="theme-muted mb-1 block text-[10px]">Metin</label>
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="theme-input w-full border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => patch({ title: title.trim(), body: body.trim() || null })}
              className="theme-button border px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Kaydet
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setTitle(announcement.title);
                setBody(announcement.body ?? "");
                setEditing(false);
              }}
              className="theme-button border px-3 py-1.5 text-xs"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {announcement.title}
              {!announcement.isActive && (
                <span className="ml-2 text-[10px] font-normal text-zinc-500">
                  (pasif)
                </span>
              )}
            </p>
            {announcement.body && (
              <p className="theme-muted mt-1 text-xs">{announcement.body}</p>
            )}
            <p className="theme-muted mt-1 text-[10px]">
              {announcement.brand
                ? `Otomatik — ${announcement.brand.name} fiyat güncellemeleriyle tazelenir`
                : "Manuel duyuru"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => patch({ isActive: !announcement.isActive })}
              className="theme-button border px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {announcement.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(true)}
              className="theme-button border px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Düzenle
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="border border-red-800 px-3 py-1.5 text-xs text-red-500 hover:bg-red-950/40 disabled:opacity-40"
            >
              Sil
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
