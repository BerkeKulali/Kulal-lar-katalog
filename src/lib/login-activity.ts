export type DeviceActivityRecord = {
  lastSeenAt: Date;
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
 * Ne dealer ne salesperson'a bağlı cihazlar (eski, isimsiz tek-seferlik bayi
 * kayıtları) yok sayılır - listede gösterilecek bir isim yok.
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
