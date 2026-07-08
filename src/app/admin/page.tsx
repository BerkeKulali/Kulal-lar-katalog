import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_NAV, formatAdminScope, getEffectivePermissions } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";
import { istanbulDaysAgo, istanbulStartOfDay } from "@/lib/site-visits";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [
    variantCount,
    orderCount,
    settings,
    visitsToday,
    visitsWeek,
    visitsMonth,
    pendingAccessRequests,
    dealerNotifications,
  ] =
    await Promise.all([
    prisma.productVariant.count({
      where: admin.brandId
        ? { family: { brandId: admin.brandId } }
        : undefined,
    }),
    prisma.order.count({
      where: { status: "NEW" },
    }),
    prisma.appSettings.findUnique({ where: { id: "default" } }),
    prisma.siteVisit.count({
      where: { createdAt: { gte: istanbulStartOfDay() } },
    }),
    prisma.siteVisit.count({
      where: { createdAt: { gte: istanbulDaysAgo(7) } },
    }),
    prisma.siteVisit.count({
      where: { createdAt: { gte: istanbulDaysAgo(30) } },
    }),
    prisma.accessRequest.count({
      where: { type: "SALESPERSON", status: "PENDING" },
    }),
    prisma.accessRequest.count({
      where: {
        type: "DEALER",
        status: "APPROVED",
        createdAt: { gte: istanbulDaysAgo(1) },
      },
    }),
  ]);

  const lastUpdate = settings?.lastPriceListUpdate
    ? new Intl.DateTimeFormat("tr-TR").format(settings.lastPriceListUpdate)
    : "-";

  const permissions = getEffectivePermissions(admin);
  const navItems = ADMIN_NAV.filter((item) => permissions.includes(item.permission));

  return (
    <AppShell variant="admin" className="py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-zinc-400">
            {admin.name} · {formatAdminScope(admin)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-white"
          >
            Kataloga dön
          </Link>
          <AdminLogoutButton />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="border border-zinc-800 p-4">
          <p className="text-2xl font-bold">{visitsToday}</p>
          <p className="text-xs text-zinc-500">Bugün giriş</p>
        </div>
        <div className="border border-zinc-800 p-4">
          <p className="text-2xl font-bold">{visitsWeek}</p>
          <p className="text-xs text-zinc-500">Son 7 gün</p>
        </div>
        <div className="border border-zinc-800 p-4">
          <p className="text-2xl font-bold">{visitsMonth}</p>
          <p className="text-xs text-zinc-500">Son 30 gün</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border border-zinc-800 p-4">
          <p className="text-2xl font-bold">{variantCount}</p>
          <p className="text-xs text-zinc-500">Fiyat satırı</p>
        </div>
        <div className="border border-zinc-800 p-4">
          <p className="text-2xl font-bold">{orderCount}</p>
          <p className="text-xs text-zinc-500">Yeni sipariş</p>
        </div>
        <div className="border border-zinc-800 p-4 col-span-2 sm:col-span-1">
          <p className="text-sm font-bold">{lastUpdate}</p>
          <p className="text-xs text-zinc-500">Son fiyat güncelleme</p>
        </div>
        <div className="border border-amber-800 p-4 col-span-2 sm:col-span-1">
          <p className="text-sm font-bold">
            {pendingAccessRequests} plasiyer onayı · {dealerNotifications} bayi bildirimi
          </p>
          <p className="text-xs text-zinc-500">Yeni giriş talepleri</p>
        </div>
      </div>

      <nav className="space-y-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block border border-zinc-700 px-4 py-4 hover:border-white"
          >
            {item.label}
          </Link>
        ))}
        {navItems.length === 0 && (
          <p className="text-sm text-zinc-500">Erişilebilir admin bölümü yok.</p>
        )}
      </nav>
    </AppShell>
  );
}
