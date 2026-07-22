import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { NetsisAssignEditor } from "@/components/admin/NetsisAssignEditor";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminNetsisPage() {
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
        <h1 className="text-lg font-bold">Netsis Kod Eşleştirme</h1>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-xs text-zinc-500">
        Her varyanta Netsis stok kodunu atayın. Stok içe aktarımı yalnızca bu
        kodla eşleşir. Bir kod yalnızca tek bir varyanta atanabilir. Kodu
        boşaltıp kaydederek atamayı kaldırabilirsiniz.
      </p>
      <NetsisAssignEditor brands={brands} />
    </AppShell>
  );
}
