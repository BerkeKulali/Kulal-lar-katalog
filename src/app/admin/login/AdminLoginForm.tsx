"use client";

import { AppShell } from "@/components/AppShell";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needKey = searchParams.get("needKey") === "1";
  const denied = searchParams.get("denied");

  const [email, setEmail] = useState("admin@kulalilar.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deniedMessage =
    denied === "tablet"
      ? "Bu tarayıcıda katalog tableti kurulumu var ve henüz admin girişi yapılmamış. Giriş yaptıktan sonra panele erişebilirsiniz; sorun sürerse gizli pencere deneyin."
      : denied === "gate"
        ? "Ofis erişim anahtarı (ADMIN_ACCESS_KEY) gerekli. Önce /admin/login?key=ANAHTARINIZ adresini açın."
        : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error ??
            (res.status === 403
              ? "Erişim anahtarı gerekli veya yetkisiz"
              : "Giriş başarısız")
        );
        return;
      }

      const meRes = await fetch("/api/admin/me");
      if (!meRes.ok) {
        setError(
          "Giriş yapıldı ancak oturum doğrulanamadı. Sayfayı yenileyip tekrar deneyin."
        );
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell variant="narrow" className="flex flex-col justify-center py-16">
      <h1 className="mb-8 text-center text-xl font-bold">Admin Girişi</h1>

      {needKey && (
        <p className="mb-4 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Ofis erişim anahtarı gerekli. Vercel&apos;deki{" "}
          <strong>ADMIN_ACCESS_KEY</strong> ile bir kez şu adresi açın:{" "}
          <code className="text-amber-100">/admin/login?key=ANAHTARINIZ</code>
        </p>
      )}

      {deniedMessage && (
        <p className="mb-4 rounded border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
          {deniedMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-zinc-700 bg-black px-4 py-3"
          placeholder="E-posta"
          autoComplete="username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-zinc-700 bg-black px-4 py-3"
          placeholder="Şifre"
          autoComplete="current-password"
        />
        {error && (
          <p className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-white py-3 font-semibold hover:bg-white hover:text-black disabled:opacity-40"
        >
          {loading ? "Giriş deneniyor…" : "Giriş yap"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] text-zinc-500">
        Demo: admin@kulalilar.com / admin123
      </p>
    </AppShell>
  );
}
