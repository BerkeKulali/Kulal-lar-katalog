/** Uygulama verisi — migration tabloları hariç */
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
  "AccessRequest",
] as const;

export type DataTable = (typeof DATA_TABLES)[number];
