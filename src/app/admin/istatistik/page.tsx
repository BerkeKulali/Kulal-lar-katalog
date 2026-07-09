"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type ClickItem = {
  familyId: string;
  count: number;
  updatedAt: string;
  familyName: string;
  familySlug: string;
  brandName: string;
  brandSlug: string;
  isActive: boolean;
};

export default function AdminClickStatsPage() {
  const [items, setItems] = useState<ClickItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/stats/family-clicks");
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "İstatistik yüklenemedi");
      return;
    }
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  const maxCount = items.length > 0 ? items[0].count : 0;

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Tıklanma istatistiği</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Bayilerin en çok baktığı ürün aileleri (detay açılış sayısı).
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
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 border border-zinc-800 p-4 text-xs text-zinc-500">
        Toplam tıklanma: {total.toLocaleString("tr-TR")} · Listelenen aile:{" "}
        {items.length}
      </div>

      {loading && items.length === 0 && (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      )}
      {!loading && items.length === 0 && !error && (
        <p className="text-sm text-zinc-500">
          Henüz tıklanma verisi yok. Bayiler ürün detaylarını açtıkça burada
          birikecek.
        </p>
      )}

      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={item.familyId}
            className="flex items-center gap-3 border border-zinc-800 px-3 py-2 text-xs"
          >
            <span className="w-6 shrink-0 text-right text-zinc-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {item.familyName}
                {!item.isActive && (
                  <span className="ml-2 text-[10px] text-zinc-600">(pasif)</span>
                )}
              </p>
              <p className="text-zinc-600">
                {item.brandName} · son {formatDate(item.updatedAt)}
              </p>
              <div className="mt-1 h-1 w-full bg-zinc-900">
                <div
                  className="h-1 bg-zinc-500"
                  style={{
                    width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {item.count.toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
