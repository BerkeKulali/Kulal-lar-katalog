export type DeviceActivityRecord = {
  id: string;
  lastSeenAt: Date;
  label: string | null;
  dealer: { id: string; name: string; isActive: boolean } | null;
  salesperson: { id: string; name: string; isActive: boolean } | null;
};

export type LoginActivityRow = {
  actorType: "dealer" | "salesperson";
  actorId: string;
  name: string;
  isActive: boolean;
  lastSeenAt: Date;
  deviceCount: number;
};

/**
 * Bir günde "aktif" (lastSeenAt o gün içinde olan) cihazları bayi/plasiyer
 * bazında tekilleştirir - aynı kişinin birden çok cihazı varsa (tablet +
 * telefon) tek satırda, en son görülen zamanla ve cihaz sayısıyla gösterilir.
 *
 * Ne dealer ne salesperson'a bağlı ama bir label'ı olan cihazlar, kullanıcı
 * adı/şifre sisteminden ÖNCE oluşturulmuş "eski, tek-seferlik" bayi
 * cihazlarıdır (bkz. prisma/schema.prisma Device.showStock yorumu ve
 * /api/admin/dealers'daki "legacyDevices" - aynı kavram). Bunların arkasında
 * bir Dealer kaydı olmadığı için birden çok cihazı tek kişide toplayacak bir
 * kimlik yok - her biri kendi cihaz id'siyle ayrı, tek cihazlık bir satır
 * olarak "dealer" tipinde gösterilir. Ne dealer/salesperson'a bağlı ne de
 * label'ı olan cihazlar (gerçekten isimsiz) yok sayılır.
 *
 * Saf fonksiyon: DB'ye dokunmaz, en son görülen üstte olacak şekilde
 * sıralanmış bir dizi döner.
 */
export function groupDeviceActivity(
  devices: DeviceActivityRecord[]
): LoginActivityRow[] {
  const map = new Map<string, LoginActivityRow>();

  for (const device of devices) {
    const actor = device.dealer
      ? {
          type: "dealer" as const,
          id: device.dealer.id,
          name: device.dealer.name,
          isActive: device.dealer.isActive,
        }
      : device.salesperson
        ? {
            type: "salesperson" as const,
            id: device.salesperson.id,
            name: device.salesperson.name,
            isActive: device.salesperson.isActive,
          }
        : device.label
          ? {
              type: "dealer" as const,
              id: `legacy:${device.id}`,
              name: device.label,
              isActive: true,
            }
          : null;
    if (!actor) continue;

    const key = `${actor.type}:${actor.id}`;
    const existing = map.get(key);
    if (existing) {
      existing.deviceCount += 1;
      if (device.lastSeenAt > existing.lastSeenAt) {
        existing.lastSeenAt = device.lastSeenAt;
      }
    } else {
      map.set(key, {
        actorType: actor.type,
        actorId: actor.id,
        name: actor.name,
        isActive: actor.isActive,
        lastSeenAt: device.lastSeenAt,
        deviceCount: 1,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime()
  );
}
