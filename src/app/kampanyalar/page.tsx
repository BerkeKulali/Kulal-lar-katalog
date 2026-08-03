import { AppShell } from "@/components/AppShell";
import { CampaignGallery } from "@/components/CampaignGallery";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveCampaigns } from "@/lib/catalog";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";

export default async function CampaignsPage() {
  const audience = await getCatalogAudienceFromCookies();
  const campaigns = await getActiveCampaigns(audience);

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <section className="mt-6 px-5">
          <h1 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            KAMPANYALAR
          </h1>

          {campaigns.length === 0 ? (
            <p className="theme-muted py-10 text-center text-sm">
              Şu anda aktif kampanya afişi yok.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {campaigns.map((c) => (
                <CampaignGallery key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </section>
      </AppShell>
    </DeviceGate>
  );
}
