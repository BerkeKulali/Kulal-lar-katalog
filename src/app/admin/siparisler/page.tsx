import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { ORDER_STATUS_LABELS } from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "orders")) redirect("/admin");

  const brandFilter = admin.brandId
    ? {
        lines: {
          some: { variant: { family: { brandId: admin.brandId } } },
        },
      }
    : undefined;

  const orders = await prisma.order.findMany({
    where: brandFilter,
    include: {
      salesperson: true,
      approvedByAdmin: { select: { name: true } },
      lines: { select: { quantityM2: true, unitPriceSnapshot: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold">Siparişler</h1>
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-white">
          ← Admin
        </Link>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz sipariş yok.</p>
        ) : (
          orders.map((order) => {
            const totalM2 = order.lines.reduce((s, l) => s + l.quantityM2, 0);
            return (
              <Link
                key={order.id}
                href={`/admin/siparisler/${order.id}`}
                className="block border border-zinc-800 p-4 text-sm transition hover:border-zinc-500"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(order.createdAt)}
                    </p>
                  </div>
                  <span className="border border-zinc-700 px-2 py-1 text-xs">
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="mt-2">
                  <span className="text-zinc-500">Bayi:</span> {order.dealerName}
                </p>
                {order.salesperson && (
                  <p className="text-xs text-zinc-500">
                    Plasiyer: {order.salesperson.name}
                  </p>
                )}
                {order.approvedByAdmin && (
                  <p className="text-xs text-emerald-600">
                    Onay: {order.approvedByAdmin.name}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  {order.lines.length} kalem · {Math.round(totalM2)} m²
                </p>
              </Link>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
