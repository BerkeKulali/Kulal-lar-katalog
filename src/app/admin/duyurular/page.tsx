import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export default async function AdminAnnouncementsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "campaigns")) redirect("/admin");

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Duyurular (ana sayfa banner)</h1>
        <Link href="/admin" className="theme-button border px-3 py-1.5 text-xs">
          ← Admin
        </Link>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        Ana sayfanın üstünde gösterilen duyuru kartları. Bir markanın fiyat
        listesi güncellendiğinde (Netsis senkron, toplu/tekli fiyat
        güncelleme veya Excel import) o markanın duyurusu otomatik olarak
        tazelenir — burada kapatabilir, metnini değiştirebilir veya
        silebilirsiniz. Markaya bağlı olmayan genel duyuruları da buradan
        elle ekleyebilirsiniz.
      </p>
      <AnnouncementManager />
    </AppShell>
  );
}
