"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

/**
 * Katalog ve admin sayfaları için ortak hata ekranı.
 * Next.js'in İngilizce varsayılan ekranı yerine geçer.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Sayfa hatası:", error);
  }, [error]);

  return (
    <AppShell variant="narrow" className="pb-12 pt-8">
      <div className="mt-20 space-y-5 px-6 text-center">
        <h1 className="text-xl font-bold tracking-wide">Bir sorun oluştu</h1>
        <p className="theme-muted text-sm">
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya
          ana sayfaya dönebilirsiniz.
        </p>

        {error.digest && (
          <p className="theme-muted font-mono text-[10px]">
            Hata kodu: {error.digest}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="w-full max-w-xs border border-zinc-600 px-4 py-3 text-sm hover:border-white"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="w-full max-w-xs border border-zinc-800 px-4 py-3 text-sm hover:border-zinc-500"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
