import { AppShell } from "@/components/AppShell";
import { SiteHeader } from "@/components/SiteHeader";
import { prisma } from "@/lib/prisma";
import { SetupEntryPanel } from "@/app/kurulum/SetupEntryPanel";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const salespeople = await prisma.salesperson.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, lockedDeviceId: true },
  });

  return (
    <AppShell variant="narrow" className="pb-12 pt-8">
      <SiteHeader />
      <div className="mt-12 space-y-4 px-6 text-center">
        <h1 className="text-xl font-bold tracking-wide">Tablet Kurulumu</h1>
        <p className="theme-muted text-sm">
          Giriş türünü seçin: Bayi, Plasiyer veya Admin.
        </p>
        <p className="theme-muted text-xs">
          Plasiyer girişleri admin onayına tabidir. Bayi girişi cihazı bayi adı
          ile kilitler ve admin paneline bildirim düşer.
        </p>
        <p className="theme-muted text-xs">
          Her zaman aynı adresi kullanın (ör.{" "}
          <span className="font-mono">http://192.168.1.10:3000</span>).{" "}
          localhost ile tablet IP farklı sayılır.
        </p>
        <p className="theme-muted text-xs">
          Giriş ekranına zorla dönmek için: <span className="font-mono">/kurulum?force=1</span>
        </p>
      </div>
      <SetupEntryPanel
        salespeople={salespeople.map((sp) => ({
          id: sp.id,
          name: sp.name,
          isLocked: Boolean(sp.lockedDeviceId),
        }))}
        initialError={error}
      />
    </AppShell>
  );
}
