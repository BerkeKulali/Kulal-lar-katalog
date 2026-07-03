"use client";

import { AppShell } from "@/components/AppShell";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
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
      setError("Giriş başarısız");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <AppShell variant="narrow" className="flex flex-col justify-center py-16">
      <h1 className="mb-8 text-center text-xl font-bold">Admin Girişi</h1>
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
