import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FamilyAttributesManager } from "@/components/admin/FamilyAttributesManager";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminColorTypePage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "families")) redirect("/admin");

  const brands = admin.brandId
    ? []
    : await prisma.brand.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Renk & Tip</h1>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Her ürüne renk ve görünüm tipi (mermer, ahşap, beton…) atayın. Bu
        bilgiler arama sayfasındaki filtre çipleri ve anasayfadaki hızlı
        butonlarla kullanılır.
      </p>
      <FamilyAttributesManager brands={brands} />
    </AppShell>
  );
}
