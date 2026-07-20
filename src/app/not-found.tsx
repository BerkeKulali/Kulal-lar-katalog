import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell variant="narrow" className="pb-12 pt-8">
      <div className="mt-20 space-y-5 px-6 text-center">
        <h1 className="text-xl font-bold tracking-wide">Sayfa bulunamadı</h1>
        <p className="theme-muted text-sm">
          Aradığınız ürün veya sayfa kaldırılmış olabilir. Katalogdan tekrar
          arayabilirsiniz.
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full max-w-xs border border-zinc-600 px-4 py-3 text-sm hover:border-white"
          >
            Ana sayfa
          </Link>
          <Link
            href="/arama"
            className="w-full max-w-xs border border-zinc-800 px-4 py-3 text-sm hover:border-zinc-500"
          >
            Ürün ara
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
