import type { AdminRole, AdminUser, Brand } from "@/generated/prisma/client";

export const ADMIN_PERMISSIONS = [
  "families",
  "images",
  "prices",
  "stock",
  "orders",
  "import",
  "salespeople",
  "admins",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  families: "Ürün aileleri",
  images: "Görsel yönetimi",
  prices: "Fiyat listesi",
  stock: "Stok yönetimi",
  orders: "Siparişler",
  import: "Excel import / export",
  salespeople: "Plasiyerler ve bayiler",
  admins: "Admin kullanıcıları",
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER: "Süper Admin",
  BRAND_MANAGER: "Admin",
};

const BRAND_MANAGER_DEFAULTS: AdminPermission[] = [
  "families",
  "images",
  "prices",
  "stock",
  "orders",
  "import",
  "salespeople",
];

export const ADMIN_NAV: {
  href: string;
  label: string;
  permission: AdminPermission;
}[] = [
  { href: "/admin/kullanicilar", label: "Admin kullanıcıları", permission: "admins" },
  {
    href: "/admin/plasiyerler",
    label: "Plasiyerler (tablet kurulumu)",
    permission: "salespeople",
  },
  {
    href: "/admin/bayiler",
    label: "Bayiler (denetim ve silme)",
    permission: "salespeople",
  },
  {
    href: "/admin/aileler",
    label: "Ürün aileleri (ekle / düzenle / sil)",
    permission: "families",
  },
  { href: "/admin/gorseller", label: "Görsel yönetimi (Cloudinary)", permission: "images" },
  { href: "/admin/fiyatlar", label: "Fiyat listesi", permission: "prices" },
  { href: "/admin/stoklar", label: "Stok yönetimi", permission: "stock" },
  { href: "/admin/siparisler", label: "Siparişler", permission: "orders" },
  { href: "/admin/import", label: "Excel import / export", permission: "import" },
];

export type AdminSession = AdminUser & {
  brand: Pick<Brand, "id" | "name" | "slug"> | null;
};

function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

export function parsePermissionsJson(raw: string | null | undefined): AdminPermission[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((p): p is AdminPermission => typeof p === "string" && isAdminPermission(p));
  } catch {
    return null;
  }
}

export function serializePermissions(permissions: AdminPermission[]): string {
  return JSON.stringify(permissions);
}

export function getEffectivePermissions(
  admin: Pick<AdminUser, "role" | "permissions">
): AdminPermission[] {
  if (admin.role === "SUPER") {
    return [...ADMIN_PERMISSIONS];
  }

  const custom = parsePermissionsJson(admin.permissions);
  if (custom && custom.length > 0) {
    return custom;
  }

  return [...BRAND_MANAGER_DEFAULTS];
}

export function hasPermission(
  admin: AdminSession,
  permission: AdminPermission
): boolean {
  return getEffectivePermissions(admin).includes(permission);
}

export function canManageAdmins(admin: AdminSession): boolean {
  return hasPermission(admin, "admins");
}

export function formatAdminScope(admin: {
  role: AdminRole;
  brand: { name: string } | null;
}): string {
  if (admin.role === "SUPER") return "Süper Admin";
  if (admin.brand) return admin.brand.name;
  return "Tüm markalar";
}

export function hasAnyPermission(
  admin: AdminSession,
  permissions: AdminPermission[]
): boolean {
  const effective = getEffectivePermissions(admin);
  return permissions.some((p) => effective.includes(p));
}
