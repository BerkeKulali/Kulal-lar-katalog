import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ClickReportView } from "@/components/admin/ClickReportView";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { parseDimensions } from "@/lib/click-report";
import { prisma } from "@/lib/prisma";

export default async function ClickReportPage({
  searchParams,
}: {
  searchParams: Promise<{ familyId?: string; dims?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "families")) redirect("/admin");

  const { familyId, dims } = await searchParams;

  const [salespeople, initialFamily] = await Promise.all([
    prisma.salesperson.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    familyId
      ? prisma.productFamily.findUnique({
          where: { id: familyId },
          select: { id: true, name: true, brand: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Tıklanma Raporları</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/istatistik"
            className="text-xs text-zinc-500 hover:text-white"
          >
            ← İstatistik
          </Link>
        </div>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Ürün, tarih ve bayi/plasiyer bazında (ayrı ayrı veya birlikte) tıklanma
        raporu. Tarih aralığı ve filtreleri seçip Excel olarak indirebilirsiniz.
      </p>
      <ClickReportView
        salespeople={salespeople}
        initialFamilyId={familyId ?? null}
        initialFamilyLabel={
          initialFamily
            ? `${initialFamily.name} · ${initialFamily.brand.name}`
            : null
        }
        initialDimensions={parseDimensions(dims)}
      />
    </AppShell>
  );
}
