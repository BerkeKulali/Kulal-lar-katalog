"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DealerLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/dealer/logout", { method: "POST" });
    } finally {
      router.push("/kurulum");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="theme-menu-item block w-full border-t border-[var(--app-border)] px-4 py-2 text-left text-sm disabled:opacity-40"
    >
      {loading ? "Çıkış yapılıyor…" : "Çıkış yap"}
    </button>
  );
}
