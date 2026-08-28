"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type DealerItem = {
  id: string;
  name: string;
  username: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  showStock: boolean;
  filterToolEnabled: boolean;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  deviceCount: number;
  lastSeenAt: string | null;
};

type LegacyDeviceItem = {
  id: string;
  label: string | null;
  registeredAt: string;
  lastSeenAt: string;
  showStock: boolean;
  filterToolEnabled: boolean;
};

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [legacyDevices, setLegacyDevices] = useState<LegacyDeviceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dealers");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Bayi listesi yüklenemedi");
        return;
      }
      setDealers(data.dealers ?? []);
      setLegacyDevices(data.legacyDevices ?? []);
    } catch {
      setError("Bayi listesi yüklenemedi (bağlantı hatası)");
    } finally {
      setLoading(false);
    }
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

  function formatDate(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  async function patchItem(id: string, body: Record<string, unknown>, successMessage: string) {
    setActionId(id);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/dealers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Bayi güncellenemedi");
      return;
    }

    setMessage(successMessage);
    await loadData();
  }

  async function removeItem(id: string, label: string, confirmText: string) {
    const ok = window.confirm(confirmText);
    if (!ok) return;

    setActionId(id);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/dealers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setActionId(null);

    if (!res.ok) {
      setError(data.error ?? "Bayi kaydı silinemedi");
      return;
    }

    setMessage(`"${data.dealerName ?? label}" kaydı silindi`);
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
            Bayi, kullanıcı adı/şifresiyle kendi kaydını oluşturur; buradan onaylayınca
            o kullanıcı adı/şifre ile herhangi bir cihazdan giriş yapabilir.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="theme-button border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {loading ? "Yenileniyor…" : "Yenile"}
          </button>
          <Link href="/admin/plasiyerler" className="theme-button border px-3 py-1.5 text-xs">
            Plasiyerler
          </Link>
          <Link href="/admin" className="theme-button border px-3 py-1.5 text-xs">
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
        {legacyDevices.length > 0 ? ` · Eski cihaz: ${legacyDevices.length}` : ""}
      </div>

      {loading && <p className="text-sm text-zinc-500">Yükleniyor…</p>}
      {!loading && dealers.length === 0 && legacyDevices.length === 0 && (
        <p className="text-sm text-zinc-500">Henüz bayi kaydı yok.</p>
      )}

      <div className="space-y-2">
        {dealers.map((item) => (
          <div key={item.id} className="border border-zinc-800 p-4 text-xs">
            <p className="font-medium">
              {item.name} <span className="text-zinc-500">· @{item.username}</span>
            </p>
            <p className="mt-1 text-zinc-500">
              Durum: {item.status}
              {item.status === "APPROVED" && !item.isActive ? " (devre dışı)" : ""}
              {item.approvedBy ? ` · işlem yapan: ${item.approvedBy}` : ""}
              {item.rejectionReason ? ` · not: ${item.rejectionReason}` : ""}
            </p>
            <p className="text-zinc-600">Kayıt: {formatDate(item.createdAt)}</p>
            {item.approvedAt && (
              <p className="text-zinc-600">Onay: {formatDate(item.approvedAt)}</p>
            )}
            {item.status === "APPROVED" && (
              <p className="text-zinc-600">
                Bağlı cihaz: {item.deviceCount} · son görülme {formatDate(item.lastSeenAt)}
              </p>
            )}

            {item.status === "APPROVED" && (
              <>
                <p className="mt-2 text-zinc-500">
                  Stok gösterimi:{" "}
                  <span className={item.showStock ? "text-emerald-400" : "text-zinc-400"}>
                    {item.showStock ? "Açık" : "Kapalı"}
                  </span>
                </p>
                <p className="text-zinc-500">
                  Ürün filtre aracı:{" "}
                  <span className={item.filterToolEnabled ? "text-emerald-400" : "text-zinc-400"}>
                    {item.filterToolEnabled ? "Açık" : "Kapalı"}
                  </span>
                </p>
              </>
            )}

            {item.status === "PENDING" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchItem(item.id, { action: "approve" }, `"${item.name}" hesabı onaylandı`)
                  }
                  disabled={actionId === item.id}
                  className="border border-emerald-800 px-3 py-1.5 text-xs text-emerald-300 disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt("Ret nedeni (opsiyonel):") ?? undefined;
                    patchItem(item.id, { action: "reject", reason }, `"${item.name}" hesabı reddedildi`);
                  }}
                  disabled={actionId === item.id}
                  className="border border-red-900 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            )}

            {item.status === "APPROVED" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchItem(
                      item.id,
                      { showStock: !item.showStock },
                      `"${item.name}" için stok gösterimi ${!item.showStock ? "açıldı" : "kapatıldı"}`
                    )
                  }
                  disabled={actionId === item.id}
                  className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                >
                  {actionId === item.id ? "..." : item.showStock ? "Stok gösterimini kapat" : "Stok gösterimini aç"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchItem(
                      item.id,
                      { filterToolEnabled: !item.filterToolEnabled },
                      `"${item.name}" için ürün filtre aracı ${!item.filterToolEnabled ? "açıldı" : "kapatıldı"}`
                    )
                  }
                  disabled={actionId === item.id}
                  className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                >
                  {actionId === item.id
                    ? "..."
                    : item.filterToolEnabled
                      ? "Filtre aracını kapat"
                      : "Filtre aracını aç"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      item.isActive &&
                      !window.confirm(
                        `"${item.name}" hesabı devre dışı bırakılsın mı? Bu bayinin tüm cihazlardaki erişimi hemen kesilir.`
                      )
                    ) {
                      return;
                    }
                    patchItem(
                      item.id,
                      { isActive: !item.isActive },
                      `"${item.name}" hesabı ${!item.isActive ? "aktifleştirildi" : "devre dışı bırakıldı"}`
                    );
                  }}
                  disabled={actionId === item.id}
                  className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                >
                  {actionId === item.id ? "..." : item.isActive ? "Hesabı devre dışı bırak" : "Hesabı aktifleştir"}
                </button>
              </div>
            )}

            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  removeItem(
                    item.id,
                    item.name,
                    `"${item.name}" (${item.username}) bayi hesabı silinsin mi? Bu işlem hesabın tüm cihaz oturumlarını da sonlandırır.`
                  )
                }
                disabled={actionId === item.id}
                className="border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
              >
                {actionId === item.id ? "Siliniyor..." : "Bayi kaydını sil"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {legacyDevices.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-300">Eski bayi cihazları</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Kullanıcı adı/şifre modelinden önce (anında kayıt döneminde) kurulmuş, tek
            cihaza bağlı bayi kayıtları. Halen çalışmaya devam ediyor; isterseniz aynı
            şekilde stok/filtre aracını buradan yönetebilir ya da silebilirsiniz.
          </p>
          <div className="mt-3 space-y-2">
            {legacyDevices.map((item) => (
              <div key={item.id} className="border border-zinc-800 p-4 text-xs">
                <p className="font-medium">{item.label ?? "Bayi cihazı"}</p>
                <p className="text-zinc-600">
                  Kurulum: {formatDate(item.registeredAt)} · son görülme{" "}
                  {formatDate(item.lastSeenAt)}
                </p>
                <p className="mt-2 text-zinc-500">
                  Stok gösterimi:{" "}
                  <span className={item.showStock ? "text-emerald-400" : "text-zinc-400"}>
                    {item.showStock ? "Açık" : "Kapalı"}
                  </span>
                </p>
                <p className="text-zinc-500">
                  Ürün filtre aracı:{" "}
                  <span className={item.filterToolEnabled ? "text-emerald-400" : "text-zinc-400"}>
                    {item.filterToolEnabled ? "Açık" : "Kapalı"}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      patchItem(
                        item.id,
                        { showStock: !item.showStock },
                        `Stok gösterimi ${!item.showStock ? "açıldı" : "kapatıldı"}`
                      )
                    }
                    disabled={actionId === item.id}
                    className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                  >
                    {actionId === item.id
                      ? "..."
                      : item.showStock
                        ? "Stok gösterimini kapat"
                        : "Stok gösterimini aç"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchItem(
                        item.id,
                        { filterToolEnabled: !item.filterToolEnabled },
                        `Ürün filtre aracı ${!item.filterToolEnabled ? "açıldı" : "kapatıldı"}`
                      )
                    }
                    disabled={actionId === item.id}
                    className="border border-zinc-700 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
                  >
                    {actionId === item.id
                      ? "..."
                      : item.filterToolEnabled
                        ? "Filtre aracını kapat"
                        : "Filtre aracını aç"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      removeItem(
                        item.id,
                        item.label ?? "Bayi cihazı",
                        `"${item.label ?? "Bayi cihazı"}" silinsin mi?`
                      )
                    }
                    disabled={actionId === item.id}
                    className="border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-500 disabled:opacity-50"
                  >
                    {actionId === item.id ? "Siliniyor..." : "Kaydı sil"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
