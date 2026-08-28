import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SearchPageView } from "@/components/SearchPageView";
import { SiteHeader } from "@/components/SiteHeader";
import { getAdminSession } from "@/lib/admin-auth";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { getGlobalSearchCatalog } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { normalizeColor, normalizeMaterialType } from "@/lib/product-attributes";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ renk?: string; tip?: string }>;
}) {
  const audience = await getCatalogAudienceFromCookies();
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const [rawSearchIndex, { renk, tip }, admin] = await Promise.all([
    getGlobalSearchCatalog(audience),
    searchParams,
    getAdminSession(),
  ]);
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    deviceToken,
  });
  const searchIndex = showStock
    ? rawSearchIndex
    : rawSearchIndex.map((item) => ({ ...item, stock: EMPTY_STOCK_SUMMARY }));

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <SearchPageView
          searchIndex={searchIndex}
          initialColor={normalizeColor(renk)}
          initialMaterialType={normalizeMaterialType(tip)}
          initialShowStock={showStock}
        />
      </AppShell>
    </DeviceGate>
  );
}
