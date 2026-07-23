"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type AuditItem = {
  id: string;
  adminName: string;
  action: string;
  entityType: string | null;
  summary: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Yüklenemedi");
      } else {
        setItems(data.items ?? []);
        setActions(data.actions ?? []);
      }
    } catch {
      setError("Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [action, q]);

  useEffect(() => {
    load();
  }, [load]);

  function formatDate(v: string) {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(v));
  }

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Denetim İzi</h1>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Fiyat, stok, ürün, renk/tip, Netsis kodu ve satış ayarı gibi kritik
        işlemlerin kim tarafından ne zaman yapıldığının kaydı.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="theme-select border px-3 py-2 text-sm"
        >
          <option value="">Tüm işlemler</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Admin adı / özet ara"
          className="theme-input min-w-[12rem] flex-1 border px-3 py-2 text-sm"
        />
        <button type="submit" className="theme-button border px-4 py-2 text-sm">
          Filtrele
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="theme-muted mb-3 text-xs">
        {loading ? "Yükleniyor…" : `${items.length} kayıt`}
      </div>

      <div className="overflow-x-auto border border-[var(--app-border)]">
        <table className="w-full text-left text-xs">
          <thead className="theme-muted border-b border-[var(--app-border)]">
            <tr>
              <th className="p-3">Tarih</th>
              <th className="p-3">Admin</th>
              <th className="p-3">İşlem</th>
              <th className="p-3">Özet</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--app-border)]">
                <td className="theme-muted whitespace-nowrap p-3">
                  {formatDate(item.createdAt)}
                </td>
                <td className="p-3">{item.adminName}</td>
                <td className="theme-muted whitespace-nowrap p-3 font-mono text-[11px]">
                  {item.action}
                </td>
                <td className="p-3">{item.summary}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="theme-muted p-6 text-center">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
