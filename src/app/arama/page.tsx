import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SearchPageView } from "@/components/SearchPageView";
import { SiteHeader } from "@/components/SiteHeader";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { getGlobalSearchCatalog } from "@/lib/catalog";
import { normalizeColor, normalizeMaterialType } from "@/lib/product-attributes";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ renk?: string; tip?: string }>;
}) {
  const audience = await getCatalogAudienceFromCookies();
  const [searchIndex, { renk, tip }] = await Promise.all([
    getGlobalSearchCatalog(audience),
    searchParams,
  ]);

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <SearchPageView
          searchIndex={searchIndex}
          initialColor={normalizeColor(renk)}
          initialMaterialType={normalizeMaterialType(tip)}
        />
      </AppShell>
    </DeviceGate>
  );
}
