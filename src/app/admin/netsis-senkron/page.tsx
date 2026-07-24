"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type SyncItem = {
  id: string;
  source: string;
  fileName: string | null;
  totalCodes: number;
  matchedCodes: number;
  unmatchedCount: number;
  variantsUpdated: number;
  lockedSkipped: number;
  zeroBalance: number;
  dryRun: boolean;
  ok: boolean;
  message: string | null;
  unmatchedSample: string[];
  createdAt: string;
};

export default function NetsisSyncPage() {
  const [items, setItems] = useState<SyncItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/netsis-sync", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Yüklenemedi");
      else setItems(data.items ?? []);
    } catch {
      setError("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function formatDate(v: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(v));
  }

  const sourceLabel = (s: string) =>
    s === "agent" ? "Otomatik (ajan)" : "Manuel";

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Netsis Senkron Geçmişi</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            className="theme-button border px-3 py-1.5 text-xs"
          >
            Yenile
          </button>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Otomatik ajan ve manuel içe aktarımların kaydı. Eşleşmeyen kod sayısı
        yüksekse ilgili varyantlara{" "}
        <a href="/admin/netsis" className="underline hover:opacity-80">
          Netsis kodu
        </a>{" "}
        atayın. Kilitli (manuel sabitlenen) varyantlar otomasyonca atlanır.
      </p>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="theme-muted mb-3 text-xs">
        {loading ? "Yükleniyor…" : `${items.length} kayıt`}
      </div>

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">Tarih</th>
              <th className="p-3">Kaynak</th>
              <th className="p-3">Durum</th>
              <th className="p-3">Eşleşen</th>
              <th className="p-3">Güncellenen</th>
              <th className="p-3">Kilitli atlanan</th>
              <th className="p-3">Eşleşmeyen</th>
              <th className="p-3">Dosya</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--app-border)]">
                <td className="theme-muted whitespace-nowrap p-3">
                  {formatDate(item.createdAt)}
                </td>
                <td className="p-3">
                  {sourceLabel(item.source)}
                  {item.dryRun && (
                    <span className="theme-muted ml-1 text-[10px]">(deneme)</span>
                  )}
                </td>
                <td className="p-3">
                  {item.ok ? (
                    <span className="text-green-600">Başarılı</span>
                  ) : (
                    <span className="text-red-500" title={item.message ?? ""}>
                      Hata
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {item.matchedCodes}/{item.totalCodes}
                </td>
                <td className="p-3">
                  {item.variantsUpdated}
                  {item.zeroBalance > 0 && (
                    <span className="theme-muted ml-1 text-[10px]">
                      ({item.zeroBalance} sıfır)
                    </span>
                  )}
                </td>
                <td className="p-3">{item.lockedSkipped || "—"}</td>
                <td className="p-3">
                  {item.unmatchedCount === 0 ? (
                    "—"
                  ) : item.unmatchedSample.length > 0 ? (
                    <details className="text-amber-500">
                      <summary className="cursor-pointer">
                        {item.unmatchedCount}
                      </summary>
                      <p className="mt-1 max-h-40 max-w-xs overflow-y-auto break-words font-mono text-[10px]">
                        {item.unmatchedSample.join(", ")}
                        {item.unmatchedCount > item.unmatchedSample.length && " …"}
                      </p>
                    </details>
                  ) : (
                    <span className="text-amber-500">{item.unmatchedCount}</span>
                  )}
                </td>
                <td className="theme-muted max-w-[10rem] truncate p-3" title={item.fileName ?? ""}>
                  {item.fileName ?? "—"}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="theme-muted p-6 text-center">
                  Henüz senkron kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
