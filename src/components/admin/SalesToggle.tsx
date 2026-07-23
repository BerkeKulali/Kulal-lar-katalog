"use client";

import { useState } from "react";

/** Admin panelinde global satış aç/kapat kontrolü. */
export function SalesToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Güncellenemedi");
      } else {
        setEnabled(data.salesEnabled);
      }
    } catch {
      setError("Güncellenemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`mb-8 flex flex-wrap items-center justify-between gap-3 border p-4 ${
        enabled ? "border-zinc-800" : "border-amber-700"
      }`}
    >
      <div>
        <p className="text-sm font-semibold">
          Satış:{" "}
          <span className={enabled ? "text-emerald-400" : "text-amber-400"}>
            {enabled ? "Açık" : "Kapalı"}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Kapalıyken katalogda sepet ve &quot;Sepete ekle&quot; gizlenir; sipariş
          alınmaz.
        </p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="border border-white px-5 py-2 text-sm font-semibold hover:bg-white hover:text-black disabled:opacity-40"
      >
        {saving ? "..." : enabled ? "Satışı kapat" : "Satışı aç"}
      </button>
    </div>
  );
}
