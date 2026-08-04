import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductFilterView } from "@/components/admin/ProductFilterView";
import { resolveFilterToolAccess } from "@/lib/filter-tool-access";
import { MATERIAL_TYPES } from "@/lib/product-attributes";
import { prisma } from "@/lib/prisma";

const ACCESS_MESSAGES: Record<string, string> = {
  "no-device": "Bu özellik için giriş yapmanız gerekiyor.",
  "not-authorized": "Bu cihaz yetkili değil, lütfen tekrar kurulum yapın.",
  "not-enabled":
    "Bu özellik için yetkiniz yok. Erişim açılması için yöneticinizle iletişime geçin.",
};

export default async function UrunFiltrePage() {
  const access = await resolveFilterToolAccess();

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <section className="mt-6 px-5">
          <h1 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            ÜRÜN FİLTRELE
          </h1>

          {!access.allowed ? (
            <p className="theme-muted py-10 text-center text-sm">
              {ACCESS_MESSAGES[access.reason] ?? "Bu özellik için yetkiniz yok."}
            </p>
          ) : (
            <FilterToolContent />
          )}
        </section>
      </AppShell>
    </DeviceGate>
  );
}

async function FilterToolContent() {
  const brands = await prisma.brand.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ProductFilterView
      brands={brands}
      materialTypes={MATERIAL_TYPES}
      apiBasePath="/api/filter-tool"
      canManagePresets={false}
    />
  );
}
