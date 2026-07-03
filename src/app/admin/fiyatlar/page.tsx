import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { AdminPricesTable } from "@/components/admin/AdminPricesTable";
import { prisma } from "@/lib/prisma";

export default async function AdminPricesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "prices")) redirect("/admin");

  const variants = await prisma.productVariant.findMany({
    where: admin.brandId
      ? { family: { brandId: admin.brandId } }
      : undefined,
    include: {
      family: { include: { brand: true } },
    },
    orderBy: [
      { family: { brand: { name: "asc" } } },
      { family: { name: "asc" } },
      { size: "asc" },
      { surface: "asc" },
      { quality: "asc" },
    ],
  });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Fiyat Listesi</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {variants.length} varyant · varsayilan olarak yalnizca 1. kalite
          </p>
        </div>
        <Link href="/admin" className="text-xs text-zinc-500">
          ← Admin
        </Link>
      </div>
      <AdminPricesTable
        rows={variants.map((v) => ({
          id: v.id,
          brandSlug: v.family.brand.slug,
          brandName: v.family.brand.name,
          familyName: v.family.name,
          size: v.size,
          surface: v.surface,
          quality: v.quality,
          price: v.price,
          code: v.code,
        }))}
      />
    </AppShell>
  );
}
