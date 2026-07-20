import { AppShell } from "@/components/AppShell";

export const metadata = {
  title: "Bağlantı yok — Kulalılar Katalog",
};

/**
 * Service worker, ağ yokken açılamayan gezinme isteklerinde bu sayfayı
 * gösterir. Tamamen statiktir; veritabanına veya ağa hiç dokunmaz.
 */
export default function OfflinePage() {
  return (
    <AppShell variant="narrow" className="pb-12 pt-8">
      <div className="mt-24 space-y-5 px-6 text-center">
        <h1 className="text-xl font-bold tracking-wide">Bağlantı yok</h1>
        <p className="theme-muted text-sm">
          İnternet bağlantısı kurulamadı. Daha önce açtığınız ürün görselleri
          çevrimdışı görüntülenebilir; fiyat ve stok bilgisi için bağlantı
          gerekir.
        </p>
        <p className="theme-muted text-xs">
          Wi-Fi veya mobil veri bağlantınızı kontrol edip sayfayı yenileyin.
        </p>
      </div>
    </AppShell>
  );
}
