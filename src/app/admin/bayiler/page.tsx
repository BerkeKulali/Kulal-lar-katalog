"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type DealerItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  dealerName: string;
  requestLabel: string;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  approvedBy: string | null;
  device: {
    id: string;
    label: string | null;
    registeredAt: string;
    lastSeenAt: string;
    showStock: boolean;
  } | null;
};

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/dealers");
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Bayi listesi yüklenemedi");
      return;
    }
    setDealers(data.dealers ?? []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sayfa açıkken hafif otomatik yenileme (sadece sekme görünürken).
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    }, 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  async function removeDealer(item: DealerItem) {
    const ok = window.confirm(
      `"${item.dealerName}" bayi kaydı silinsin mi? Bu işlem mevcut cihaz erişimini de sonlandırır.`
    );
    if (!ok) return;

    setActionId(item.id);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/dealers/${item.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Bayi kaydı silinemedi");
      return;
    }

    setMessage(`"${data.dealerName ?? item.dealerName}" kaydı silindi`);
    await loadData();
  }

  async function toggleStock(item: DealerItem) {
    if (!item.device) return;
    const next = !item.device.showStock;
    setActionId(item.id);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/dealers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showStock: next }),
    });
    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Stok ayarı güncellenemedi");
      return;
    }

    setMessage(
      `"${item.dealerName}" için stok gösterimi ${next ? "açıldı" : "kapatıldı"}`
    );
    await loadData();
  }

  const pending = dealers.filter((d) => d.status === "PENDING").length;
  const approved = dealers.filter((d) => d.status === "APPROVED").length;
  const rejected = dealers.filter((d) => d.status === "REJECTED").length;

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Bayiler</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Bayi tablet kayıtlarını denetle ve gerektiğinde sil.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-white disabled:opacity-40"
          >
            {loading ? "Yenileniyor…" : "Yenile"}
          </button>
          <Link href="/admin/plasiyerler" className="text-xs text-zinc-500 hover:text-white">
            Plasiyerler
          </Link>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
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

      <div className="mb-6 border border-zinc-800 p-4 text-xs text-zinc-500">
        Toplam: {dealers.length} · Bekleyen: {pending} · Onaylı: {approved} ·
        Reddedilen: {rejected}
      </div>

      {loading && <p className="text-sm text-zinc-500">Yükleniyor…</p>}
      {!loading && dealers.length === 0 && (
        <p className="text-sm text-zinc-500">Henüz bayi kaydı yok.</p>
      )}

      <div className="space-y-2">
        {dealers.map((item) => (
          <div key={item.id} className="border border-zinc-800 p-4 text-xs">
            <p className="font-medium">{item.dealerName}</p>
            <p className="mt-1 text-zinc-500">
              Durum: {item.status}
              {item.approvedBy ? ` · işlem yapan: ${item.approvedBy}` : ""}
              {item.rejectionReason ? ` · not: ${item.rejectionReason}` : ""}
            </p>
            <p className="text-zinc-600">Talep: {formatDate(item.createdAt)}</p>
            {item.device && (
              <p className="text-zinc-600">
                Cihaz: {item.device.label ?? item.device.id} · son görülme{" "}
                {formatDate(item.device.lastSeenAt)}
              </p>
            )}
            {item.approvedAt && (
              <p className="text-zinc-600">Onay: {formatDate(item.approvedAt)}</p>
            )}
            {item.completedAt && (
              <p className="text-zinc-600">
                Tamamlanma: {formatDate(item.completedAt)}
              </p>
            )}

            {item.device && (
              <p className="mt-2 text-zinc-500">
                Stok gösterimi:{" "}
                <span
                  className={
                    item.device.showStock ? "text-emerald-400" : "text-zinc-400"
                  }
                >
                  {item.device.showStock ? "Açık" : "Kapalı"}
                </span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {item.device && (
                <button
                  type="button"
                  onClick={() => toggleStock(item)}
                  disabled={actionId === item.id}
                  className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                >
                  {actionId === item.id
                    ? "..."
                    : item.device.showStock
                      ? "Stok gösterimini kapat"
                      : "Stok gösterimini aç"}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeDealer(item)}
                disabled={actionId === item.id}
                className="border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
              >
                {actionId === item.id ? "Siliniyor..." : "Bayi kaydını sil"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
