import { NextResponse } from "next/server";
import type { AdminRole } from "@/generated/prisma/client";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  ADMIN_PERMISSIONS,
  getEffectivePermissions,
  parsePermissionsJson,
  serializePermissions,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return null;
  return name;
}

function normalizePassword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const password = raw.trim();
  if (password.length < 4) return null;
  return password;
}

function normalizeRole(raw: unknown): AdminRole | null {
  if (raw === "SUPER" || raw === "BRAND_MANAGER") return raw;
  return null;
}

function normalizePermissions(raw: unknown): AdminPermission[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const list = raw.filter(
    (p): p is AdminPermission => typeof p === "string" && isAdminPermission(p)
  );
  return list.length > 0 ? list : [];
}

function toPublicAdmin(user: {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  brandId: string | null;
  permissions: string | null;
  brand: { id: string; name: string; slug: string } | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
    brandName: user.brand?.name ?? null,
    brandSlug: user.brand?.slug ?? null,
    permissions: parsePermissionsJson(user.permissions),
    effectivePermissions: getEffectivePermissions(user),
    createdAt: user.createdAt,
  };
}

export async function GET() {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const users = await prisma.adminUser.findMany({
    include: { brand: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    users: users.map(toPublicAdmin),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);
  const role = normalizeRole(body.role) ?? "BRAND_MANAGER";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Ad, e-posta ve şifre (min. 4 karakter) gerekli" },
      { status: 400 }
    );
  }

  if (role === "SUPER" && auth.admin.role !== "SUPER") {
    return NextResponse.json(
      { error: "Süper admin yalnızca süper admin tarafından oluşturulabilir" },
      { status: 403 }
    );
  }

  let brandId: string | null =
    typeof body.brandId === "string" && body.brandId.trim()
      ? body.brandId.trim()
      : null;

  if (role === "BRAND_MANAGER" && brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: "Marka bulunamadı" }, { status: 400 });
    }
  } else if (role === "SUPER") {
    brandId = null;
  }

  const permissions = normalizePermissions(body.permissions);
  const permissionsJson =
    role === "BRAND_MANAGER" && permissions
      ? serializePermissions(permissions)
      : null;

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta zaten kayıtlı" },
      { status: 409 }
    );
  }

  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      passwordChangedAt: new Date(),
      role,
      permissions: permissionsJson,
      ...(role === "BRAND_MANAGER" && brandId
        ? { brand: { connect: { id: brandId } } }
        : {}),
    },
    include: { brand: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json({ ok: true, user: toPublicAdmin(user) });
}
