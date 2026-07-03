import type { ReactNode } from "react";

/** Kurulum kontrolü middleware + cookie ile yapılır; bu bileşen sadece sarmalayıcı. */
export function DeviceGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
