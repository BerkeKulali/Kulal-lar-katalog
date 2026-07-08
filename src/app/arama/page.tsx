import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SearchPageView } from "@/components/SearchPageView";
import { SiteHeader } from "@/components/SiteHeader";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { getGlobalSearchCatalog } from "@/lib/catalog";

export default async function SearchPage() {
  const audience = await getCatalogAudienceFromCookies();
  const searchIndex = await getGlobalSearchCatalog(audience);

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <SearchPageView searchIndex={searchIndex} />
      </AppShell>
    </DeviceGate>
  );
}
