"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Plasiyer = {
  id: string;
  name: string;
  isActive: boolean;
  orderCount: number;
  deviceCount: number;
  visitCount: number;
  isTabletLocked: boolean;
  lockedDevice: {
    id: string;
    label: string;
    lastSeenAt: string;
    registeredAt: string;
  } | null;
};

export default function AdminPlasiyerlerPage() {
  const [salespeople, setSalespeople] = useState<Plasiyer[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/admin/salespeople");
    if (!res.ok) {
      setError("Liste yüklenemedi");
      return;
    }
    const data = await res.json();
    setSalespeople(data.salespeople ?? []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/admin/salespeople", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Eklenemedi");
      return;
    }

    setNewName("");
    setMessage(`"${data.salesperson?.name}" eklendi`);
    await loadData();
  }

  function startEdit(sp: Plasiyer) {
    setEditingId(sp.id);
    setEditName(sp.name);
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(id: string) {
    setActionId(id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/salespeople/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });

    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi");
      return;
    }

    setMessage(`"${data.salesperson?.name}" güncellendi`);
    cancelEdit();
    await loadData();
  }

  async function toggleActive(sp: Plasiyer) {
    setActionId(sp.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/salespeople/${sp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sp.isActive }),
    });

    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Durum güncellenemedi");
      return;
    }

    setMessage(
      `"${sp.name}" ${data.salesperson?.isActive ? "aktif" : "pasif"} yapıldı`
    );
    await loadData();
  }

  async function remove(sp: Plasiyer) {
    const hasHistory = sp.orderCount > 0 || sp.deviceCount > 0;
    const ok = window.confirm(
      hasHistory
        ? `"${sp.name}" sipariş veya tablet kaydı olduğu için silinmeyecek; pasif yapılacak. Devam?`
        : `"${sp.name}" kalıcı olarak silinsin mi?`
    );
    if (!ok) return;

    setActionId(sp.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/salespeople/${sp.id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Silinemedi");
      return;
    }

    setMessage(
      data.deactivated
        ? `"${sp.name}" pasif yapıldı`
        : `"${sp.name}" silindi`
    );
    if (editingId === sp.id) cancelEdit();
    await loadData();
  }

  async function unlockTablet(sp: Plasiyer) {
    const ok = window.confirm(
      `"${sp.name}" için tablet kilidini kaldırmak istediğinize emin misiniz? Mevcut tablet oturumu sonlanır ve yeniden kurulum gerekir.`
    );
    if (!ok) return;

    setActionId(sp.id);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/admin/salespeople/${sp.id}/unlock-tablet`, {
      method: "POST",
    });

    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Tablet kilidi kaldırılamadı");
      return;
    }

    setMessage(data.message ?? `"${sp.name}" için tablet kilidi kaldırıldı`);
    await loadData();
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Plasiyerler</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Tablet kurulumunda görünen isimler
          </p>
        </div>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>

      {message && (
        <p className="mb-4 border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-8 flex flex-col gap-3 border border-zinc-800 p-4 sm:flex-row sm:items-end"
      >
        <label className="block flex-1 text-xs text-zinc-500">
          Yeni plasiyer
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ad Soyad"
            className="mt-1 w-full border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="submit"
          disabled={loading || newName.trim().length < 2}
          className="border border-zinc-600 px-4 py-2 text-sm font-semibold hover:border-white disabled:opacity-50"
        >
          Ekle
        </button>
      </form>

      <div className="space-y-2">
        {salespeople.length === 0 && (
          <p className="text-sm text-zinc-500">Henüz plasiyer yok.</p>
        )}
        {salespeople.map((sp) => (
          <div
            key={sp.id}
            className={`flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between ${
              sp.isActive ? "border-zinc-800" : "border-zinc-900 opacity-60"
            }`}
          >
            <div className="min-w-0 flex-1">
              {editingId === sp.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
                  autoFocus
                />
              ) : (
                <p className="font-medium">{sp.name}</p>
              )}
              <p className="mt-1 text-[11px] text-zinc-600">
                {sp.orderCount} sipariş · {sp.visitCount} giriş · {sp.deviceCount}{" "}
                tablet
                {!sp.isActive && " · Pasif"}
              </p>
              {sp.isTabletLocked && sp.lockedDevice && (
                <p className="mt-1 text-[11px] text-amber-500/90">
                  Tablet bağlı · son görülme{" "}
                  {formatDate(sp.lockedDevice.lastSeenAt)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {editingId === sp.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => saveEdit(sp.id)}
                    disabled={actionId === sp.id || editName.trim().length < 2}
                    className="border border-zinc-600 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-white"
                  >
                    İptal
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => unlockTablet(sp)}
                    disabled={actionId === sp.id || !sp.isTabletLocked}
                    className="border border-amber-800 px-3 py-1.5 text-xs text-amber-300 hover:border-amber-500 disabled:opacity-40"
                  >
                    Tablet kilidini kaldır
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(sp)}
                    className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(sp)}
                    disabled={actionId === sp.id}
                    className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                  >
                    {sp.isActive ? "Pasif yap" : "Aktif yap"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(sp)}
                    disabled={actionId === sp.id}
                    className="border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
