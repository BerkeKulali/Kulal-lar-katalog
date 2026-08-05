import { prisma } from "@/lib/prisma";

/**
 * Bir markanın fiyat listesi güncellendiğinde ana sayfadaki "duyuru"
 * bloğunu otomatik olarak günceller. Marka için zaten bir duyuru varsa
 * (brandId ile bağlı, ya da eski/manuel eklenmiş "{Marka} ..." başlıklı
 * bağlantısız bir kayıt) onun başlık/metnini tazeler ve markaya bağlar —
 * yeni bir tekrar oluşturmaz. Yoksa yeni bir tane açar.
 *
 * `isActive` yalnızca YENİ oluştururken true set edilir; admin var olan
 * bir duyuruyu bilerek pasif yapmışsa, fiyat güncellemesi onu tekrar
 * göstermeye zorlamaz — admin panelinden (bkz. /admin/duyurular) elle
 * yönetilmeye devam eder.
 */
export async function upsertBrandPriceAnnouncement(
  brandId: string,
  options?: { sizes?: string[] }
) {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true, logoText: true },
  });
  if (!brand) return;

  // Katalogda markanın kısa görünen adı (bkz. BrandCatalogTile) —
  // duyuru başlığı da aynı kısa isimle tutarlı olsun diye bu kullanılıyor.
  const displayName = brand.logoText ?? brand.name;

  const uniqueSizes = Array.from(
    new Set((options?.sizes ?? []).map((s) => s.trim()).filter(Boolean))
  );

  const title = `${displayName} fiyat listesi güncellendi`;
  const body =
    uniqueSizes.length > 0 && uniqueSizes.length <= 4
      ? `${uniqueSizes.join(" ve ")} serilerinde güncel fiyatlar yayında.`
      : "Güncel fiyatlar yayında.";

  const existing = await prisma.announcement.findFirst({
    where: {
      OR: [
        { brandId: brand.id },
        { brandId: null, title: { startsWith: `${displayName} ` } },
      ],
    },
  });

  if (existing) {
    await prisma.announcement.update({
      where: { id: existing.id },
      data: { title, body, brandId: brand.id },
    });
  } else {
    await prisma.announcement.create({
      data: { title, body, brandId: brand.id, isActive: true, sortOrder: 0 },
    });
  }
}
