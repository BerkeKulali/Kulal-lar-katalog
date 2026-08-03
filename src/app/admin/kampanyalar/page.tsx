import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CampaignManager } from "@/components/admin/CampaignManager";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export default async function AdminCampaignsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "campaigns")) redirect("/admin");

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Kampanyalar (afiş galerisi)</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/kampanyalar/urunler"
            className="text-xs text-zinc-500 hover:text-white"
          >
            Ürün segmentleri →
          </Link>
          <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Banner-studio&apos;da hazırladığınız afişleri PNG/JPG sayfalar olarak
        yükleyin. Aktif kampanyalar kataloğun &quot;Kampanyalar&quot;
        bölümünde bayi/plasiyerlere görüntülenir (indirilebilir dosya değil,
        kaydırmalı galeri olarak).
      </p>
      <CampaignManager />
    </AppShell>
  );
}
