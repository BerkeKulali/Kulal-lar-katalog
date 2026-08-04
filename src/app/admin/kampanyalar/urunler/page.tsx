import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProductFilterView } from "@/components/admin/ProductFilterView";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { MATERIAL_TYPES } from "@/lib/product-attributes";
import { prisma } from "@/lib/prisma";

export default async function AdminProductFilterPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "campaigns")) redirect("/admin");

  const brands = admin.brandId
    ? []
    : await prisma.brand.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Ürün segmentleri</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/kampanyalar"
            className="text-xs text-zinc-500 hover:text-white"
          >
            Kampanyalar →
          </Link>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Marka, malzeme tipi, kalite ve stok eşiğine göre ürün listesi çıkarın
        (örn. &quot;Güral 250 m² altı ürünler&quot;). Sonucu Excel veya PDF
        olarak indirebilir, sık kullandığınız kombinasyonları isimlendirip
        kaydedebilirsiniz.
      </p>
      <ProductFilterView
        brands={brands}
        materialTypes={MATERIAL_TYPES}
        apiBasePath="/api/admin/campaigns"
      />
    </AppShell>
  );
}
