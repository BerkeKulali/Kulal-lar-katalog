import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StockManager } from "@/components/admin/StockManager";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminStockPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "stock")) redirect("/admin");

  // Süper admin markaya göre filtreleyebilsin; marka yöneticisi kendi markasında sabit.
  const brands = admin.brandId
    ? []
    : await prisma.brand.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Stok Yönetimi</h1>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Netsis/CSV dosyasından toplu stok içe aktarın veya seçtiğiniz ürünlerin
        stoğunu elle girdiğiniz değere sabitleyin. İçe aktarma yalnızca Netsis
        kodu atanmış varyantlarda çalışır; manuel sabitleme her varyantta çalışır.
      </p>
      <StockManager brands={brands} />
    </AppShell>
  );
}
