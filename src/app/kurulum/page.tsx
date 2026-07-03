import { AppShell } from "@/components/AppShell";
import { SiteHeader } from "@/components/SiteHeader";
import { registerTabletAction } from "@/app/kurulum/actions";
import { prisma } from "@/lib/prisma";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const salespeople = await prisma.salesperson.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell variant="narrow" className="pb-12 pt-8">
      <SiteHeader />
      <div className="mt-12 space-y-4 px-6 text-center">
        <h1 className="text-xl font-bold tracking-wide">Tablet Kurulumu</h1>
        <p className="theme-muted text-sm">
          Bu tableti kullanacak plasiyeri seçin.
        </p>
        <p className="theme-muted text-xs">
          Her zaman aynı adresi kullanın (ör.{" "}
          <span className="font-mono">http://192.168.1.10:3000</span>).{" "}
          localhost ile tablet IP farklı sayılır.
        </p>
      </div>
      <form
        action={registerTabletAction}
        className="mx-auto mt-10 max-w-md space-y-6 px-6"
      >
        <div>
          <label
            className="theme-label mb-2 block text-sm"
            htmlFor="salespersonId"
          >
            Plasiyer
          </label>
          <select
            id="salespersonId"
            name="salespersonId"
            defaultValue={salespeople[0]?.id ?? ""}
            className="theme-select w-full border px-4 py-3"
            disabled={salespeople.length === 0}
            required
          >
            {salespeople.length === 0 ? (
              <option value="">Plasiyer tanımlı değil</option>
            ) : (
              salespeople.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))
            )}
          </select>
        </div>
        {salespeople.length === 0 && (
          <p className="text-sm text-amber-400">
            Admin panelinden en az bir plasiyer ekleyin.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={salespeople.length === 0}
          className="theme-button w-full border py-3 text-sm font-semibold tracking-wide disabled:opacity-50"
        >
          Bu tableti kaydet
        </button>
        <p className="theme-muted text-center text-xs">
          Bir kez kaydedilir; sonraki açılışlarda otomatik giriş yapılır.
        </p>
      </form>
    </AppShell>
  );
}
