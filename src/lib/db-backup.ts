import { prisma } from "@/lib/prisma";

export const DATA_TABLES = [
  "Brand",
  "Salesperson",
  "AdminUser",
  "ProductFamily",
  "ProductVariant",
  "StockLine",
  "Device",
  "Order",
  "OrderLine",
  "OrderAdminLog",
  "Announcement",
  "AppSettings",
] as const;

export type DbBackupManifest = {
  exportedAt: string;
  source: "turso";
  label: string;
  tables: Record<string, Record<string, unknown>[]>;
  summary: {
    variants: number;
    families: number;
    salespeople: string[];
  };
};

export function backupTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function rowToJson<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function exportDatabaseManifest(
  label: string
): Promise<DbBackupManifest> {
  const [
    brands,
    salespeople,
    admins,
    families,
    variants,
    stockLines,
    devices,
    orders,
    orderLines,
    orderLogs,
    announcements,
    settings,
  ] = await Promise.all([
    prisma.brand.findMany(),
    prisma.salesperson.findMany(),
    prisma.adminUser.findMany(),
    prisma.productFamily.findMany(),
    prisma.productVariant.findMany(),
    prisma.stockLine.findMany(),
    prisma.device.findMany(),
    prisma.order.findMany(),
    prisma.orderLine.findMany(),
    prisma.orderAdminLog.findMany(),
    prisma.announcement.findMany(),
    prisma.appSettings.findMany(),
  ]);

  const tables: DbBackupManifest["tables"] = {
    Brand: brands.map(rowToJson),
    Salesperson: salespeople.map(rowToJson),
    AdminUser: admins.map(rowToJson),
    ProductFamily: families.map(rowToJson),
    ProductVariant: variants.map(rowToJson),
    StockLine: stockLines.map(rowToJson),
    Device: devices.map(rowToJson),
    Order: orders.map(rowToJson),
    OrderLine: orderLines.map(rowToJson),
    OrderAdminLog: orderLogs.map(rowToJson),
    Announcement: announcements.map(rowToJson),
    AppSettings: settings.map(rowToJson),
  };

  return {
    exportedAt: new Date().toISOString(),
    source: "turso",
    label,
    tables,
    summary: {
      variants: variants.length,
      families: families.length,
      salespeople: salespeople.map((s) => s.name),
    },
  };
}

export function manifestFilename(label: string) {
  return `kulalilar-db-${label}-${backupTimestamp()}.json`;
}
