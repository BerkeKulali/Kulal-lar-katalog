import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrandVisibilityManager } from "@/components/admin/BrandVisibilityManager";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export default async function AdminBrandsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "admins")) redirect("/admin");

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold">Marka görünürlüğü</h1>
        <Link href="/admin" className="theme-button border px-3 py-1.5 text-xs">
          ← Admin
        </Link>
      </div>
      <p className="theme-muted mb-6 max-w-2xl text-xs">
        &ldquo;Herkese görünür&rdquo; kapalıysa marka katalogda hiç görünmez
        (ör. KALE). &ldquo;Bayilere görünür&rdquo; kapalıysa marka yalnızca
        bayi hesaplarından/cihazlarından gizlenir, plasiyer ve admin
        görünümlerinde görünmeye devam eder (ör. BIEN, QUA).
      </p>
      <BrandVisibilityManager />
    </AppShell>
  );
}
