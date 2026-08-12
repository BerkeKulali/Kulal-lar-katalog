import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { SearchPageView } from "@/components/SearchPageView";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAdminSession } from "@/lib/admin-auth";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { getGlobalSearchCatalog } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
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
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const [rawSearchIndex, { renk, tip }, admin] = await Promise.all([
    getGlobalSearchCatalog(audience),
    searchParams,
    getAdminSession(),
  ]);
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    salespersonId,
    deviceToken,
  });
  const searchIndex = showStock
    ? rawSearchIndex
    : rawSearchIndex.map((item) => ({ ...item, stock: EMPTY_STOCK_SUMMARY }));

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader
          rightSlot={
            <>
              <DisplayPrefsToggle initialShowStock={showStock} />
              <ThemeToggle />
            </>
          }
        />
        <SearchPageView
          searchIndex={searchIndex}
          initialColor={normalizeColor(renk)}
          initialMaterialType={normalizeMaterialType(tip)}
        />
      </AppShell>
    </DeviceGate>
  );
}
