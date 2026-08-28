import type { ReactNode } from "react";

/**
 * DİKKAT (isim yanıltıcı): bu bileşen kendisi HİÇBİR kontrol yapmıyor,
 * yalnızca children'ı olduğu gibi geri döndüren saydam bir sarmalayıcı.
 * Cihazın kurulumlu/yetkili olup olmadığı kontrolü tamamen src/proxy.ts
 * (middleware) + isPublicPath/DEVICE_TOKEN_COOKIE üzerinden yapılır ve
 * middleware zaten yetkisiz istekleri /kurulum'a yönlendirdiği için bu
 * bileşen çalıştığında cihaz her zaman zaten doğrulanmış olur. Burada
 * "gate" mantığı arayan biri onu proxy.ts'de bulmalı.
 */
export function DeviceGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
