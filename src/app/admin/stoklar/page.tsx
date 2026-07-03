import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";
import { formatStock } from "@/lib/utils";

export default async function AdminStockPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "stock")) redirect("/admin");

  const stockLines = await prisma.stockLine.findMany({
    where: admin.brandId
      ? { variant: { family: { brandId: admin.brandId } } }
      : undefined,
    include: {
      variant: {
        include: {
          family: { include: { brand: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold">Stok Yönetimi</h1>
        <Link href="/admin" className="text-xs text-zinc-500">
          ← Admin
        </Link>
      </div>
      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="p-3">Marka</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Ölçü</th>
              <th className="p-3">Etiket</th>
              <th className="p-3">Miktar</th>
            </tr>
          </thead>
          <tbody>
            {stockLines.map((line) => (
              <tr key={line.id} className="border-b border-zinc-900">
                <td className="p-3">{line.variant.family.brand.name}</td>
                <td className="p-3">
                  {line.variant.family.name} {line.variant.surface}{" "}
                  {line.variant.quality === "FIRST" ? "1." : "END"}
                </td>
                <td className="p-3">{line.variant.size.toUpperCase()}</td>
                <td className="p-3">{line.label}</td>
                <td className="p-3">{formatStock(line.quantityM2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
