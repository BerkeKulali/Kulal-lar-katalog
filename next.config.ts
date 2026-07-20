import type { NextConfig } from "next";
import os from "os";

/** Tablet / LAN üzerinden dev: JS yüklenmesi için gerekli (Next.js 16+) */
function lanDevOrigins(): string[] {
  // Ağ arayüzlerinden otomatik algılanır; ek origin için ALLOWED_DEV_ORIGINS.
  const hosts = new Set(["localhost", "127.0.0.1"]);
  try {
    for (const iface of Object.values(os.networkInterfaces())) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === "IPv4" && !addr.internal) {
          hosts.add(addr.address);
        }
      }
    }
  } catch {
    // CI / kısıtlı ortam
  }
  const extra = process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim());
  if (extra) extra.forEach((h) => h && hosts.add(h));
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
};

export default nextConfig;
