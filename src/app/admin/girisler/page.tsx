"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";

type LoginItem = {
  actorType: "dealer" | "salesperson";
  actorId: string;
  name: string;
  isActive: boolean;
  lastSeenAt: string;
  deviceCount: number;
};

type ActorFilter = "" | "dealer" | "salesperson";

function todayIstanbul(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

export default function AdminLoginsPage() {
  const [date, setDate] = useState(todayIstanbul());
  const [items, setItems] = useState<LoginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actorType, setActorType] = useState<ActorFilter>("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/logins?date=${date}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Yüklenemedi");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLocaleLowerCase("tr-TR");
    return items.filter((item) => {
      if (actorType && item.actorType !== actorType) return false;
      if (query && !item.name.toLocaleLowerCase("tr-TR").includes(query)) return false;
      return true;
    });
  }, [items, actorType, q]);

  function formatTime(value: string) {
    return new Intl.DateTimeFormat("tr-TR", { timeStyle: "short" }).format(
      new Date(value)
    );
  }

  const isToday = date === todayIstanbul();

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Girişler</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Seçilen günde kataloğu kullanmış bayi ve plasiyerler (cihaz &quot;son
            görülme&quot; zamanına göre).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => load()}
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
          <label className="mb-1 block text-xs text-zinc-500">Gün</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, -1))}
              className="theme-button border px-2 py-2 text-xs"
            >
              ← Dün
            </button>
            <input
              type="date"
              value={date}
              max={todayIstanbul()}
              onChange={(e) => setDate(e.target.value || todayIstanbul())}
              className="border border-zinc-700 bg-black px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, 1))}
              disabled={isToday}
              className="theme-button border px-2 py-2 text-xs disabled:opacity-40"
            >
              Sonraki gün →
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setDate(todayIstanbul())}
                className="theme-button border px-2 py-2 text-xs"
              >
                Bugün
              </button>
            )}
          </div>
        </div>

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

        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-zinc-500">Ara</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim ara…"
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 border border-zinc-800 p-4 text-xs text-zinc-500">
        {isToday ? "Bugün" : date} giriş yapan: {filtered.length}
        {filtered.length !== items.length && ` (toplam ${items.length})`}
      </div>

      {loading && items.length === 0 && (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      )}
      {!loading && filtered.length === 0 && !error && (
        <p className="text-sm text-zinc-500">Bu tarihte/filtrede giriş kaydı yok.</p>
      )}

      <div className="space-y-1.5">
        {filtered.map((item) => (
          <div
            key={`${item.actorType}:${item.actorId}`}
            className="flex items-center gap-3 border border-zinc-800 px-3 py-2 text-xs"
          >
            <span
              className={`shrink-0 border px-2 py-1 text-[10px] font-semibold ${
                item.actorType === "dealer"
                  ? "border-sky-800 text-sky-300"
                  : "border-emerald-800 text-emerald-300"
              }`}
            >
              {item.actorType === "dealer" ? "Bayi" : "Plasiyer"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {item.name}
                {!item.isActive && (
                  <span className="ml-2 text-[10px] text-zinc-600">(pasif)</span>
                )}
              </p>
              <p className="text-zinc-600">
                {item.deviceCount} cihaz · son görülme {formatTime(item.lastSeenAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
