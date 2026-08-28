"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Brand = { id: string; name: string };

type Range = "today" | "7d" | "30d" | "all";
type ActorFilter = "" | "dealer" | "salesperson";

export default function AdminClickStatsPage() {
  const [items, setItems] = useState<ClickItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [range, setRange] = useState<Range>("all");
  const [brandId, setBrandId] = useState("");
  const [actorType, setActorType] = useState<ActorFilter>("");

  useEffect(() => {
    fetch("/api/admin/brands")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBrands(data?.brands ?? []))
      .catch(() => setBrands([]));
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (range !== "all") params.set("range", range);
    if (brandId) params.set("brandId", brandId);
    if (actorType) params.set("actorType", actorType);
    return params;
  }, [range, brandId, actorType]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats/family-clicks?${query.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "İstatistik yüklenemedi");
        return;
      }
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("İstatistik yüklenemedi (bağlantı hatası)");
    } finally {
      setLoading(false);
    }
  }, [query]);

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
          <Link
            href="/admin/istatistik/rapor"
            className="theme-button border px-3 py-1.5 text-xs"
          >
            Raporlar
          </Link>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="theme-button border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {loading ? "Yenileniyor…" : "Yenile"}
          </button>
          <Link href="/admin" className="theme-button border px-3 py-1.5 text-xs">
            ← Admin
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 border border-zinc-800 p-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Dönem</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="today">Bugün</option>
            <option value="7d">Son 7 gün</option>
            <option value="30d">Son 30 gün</option>
            <option value="all">Tümü</option>
          </select>
        </div>

        {brands.length > 1 && (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Marka</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="border border-zinc-700 bg-black px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-zinc-500">Bayi / Plasiyer</label>
          <select
            value={actorType}
            onChange={(e) => setActorType(e.target.value as ActorFilter)}
            className="border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="">Tümü</option>
            <option value="dealer">Yalnızca bayi</option>
            <option value="salesperson">Yalnızca plasiyer</option>
          </select>
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
          Bu filtrelere uyan tıklanma verisi yok.
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
                <Link
                  href={`/admin/istatistik/rapor?familyId=${item.familyId}&dims=actor,date`}
                  className="hover:underline"
                >
                  {item.familyName}
                </Link>
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
