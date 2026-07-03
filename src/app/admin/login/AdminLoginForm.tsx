"use client";

import { AppShell } from "@/components/AppShell";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needKey = searchParams.get("needKey") === "1";
  const tabletBlocked = searchParams.get("tablet") === "1";

  const [email, setEmail] = useState("admin@kulalilar.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        setError("Erişim anahtarı gerekli veya yetkisiz");
      } else {
        setError(data?.error ?? "Giriş başarısız — e-posta veya şifre hatalı");
      }
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
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

      {tabletBlocked && (
        <p className="mb-4 rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-400">
          Bu tarayıcıda katalog tableti kurulumu var; admin panele girmek için{" "}
          <strong>gizli pencere</strong> veya kurulum yapılmamış başka bir
          tarayıcı kullanın.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-zinc-700 bg-black px-4 py-3"
          placeholder="E-posta"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-zinc-700 bg-black px-4 py-3"
          placeholder="Şifre"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-white py-3 font-semibold hover:bg-white hover:text-black"
        >
          Giriş yap
        </button>
      </form>
    </AppShell>
  );
}
