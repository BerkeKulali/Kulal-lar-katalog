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
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2) return null;
  return name;
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
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

function normalizePermissions(raw: unknown): AdminPermission[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Array.isArray(raw)) return undefined;
  const list = raw.filter(
    (p): p is AdminPermission => typeof p === "string" && isAdminPermission(p)
  );
  return list;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.adminUser.findUnique({
    where: { id },
    include: { brand: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: {
    name?: string;
    email?: string;
    password?: string;
    role?: AdminRole;
    permissions?: string | null;
    brand?: { connect: { id: string } } | { disconnect: true };
  } = {};

  if (body.name !== undefined) {
    const name = normalizeName(body.name);
    if (!name) {
      return NextResponse.json({ error: "Geçerli bir ad girin" }, { status: 400 });
    }
    data.name = name;
  }

  if (body.email !== undefined) {
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json(
        { error: "Geçerli bir e-posta girin" },
        { status: 400 }
      );
    }
    const clash = await prisma.adminUser.findFirst({
      where: { email, NOT: { id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Bu e-posta başka bir kullanıcıda kayıtlı" },
        { status: 409 }
      );
    }
    data.email = email;
  }

  if (body.password !== undefined && body.password !== "") {
    const password = normalizePassword(body.password);
    if (!password) {
      return NextResponse.json(
        { error: "Şifre en az 4 karakter olmalı" },
        { status: 400 }
      );
    }
    data.password = password;
  }

  const nextRole =
    body.role !== undefined ? normalizeRole(body.role) : existing.role;
  if (body.role !== undefined && !nextRole) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }

  if (
    nextRole === "SUPER" &&
    auth.admin.role !== "SUPER" &&
    body.role !== undefined
  ) {
    return NextResponse.json(
      { error: "Süper admin rolü yalnızca süper admin atayabilir" },
      { status: 403 }
    );
  }

  if (
    existing.id === auth.admin.id &&
    body.role !== undefined &&
    nextRole !== "SUPER" &&
    existing.role === "SUPER"
  ) {
    const superCount = await prisma.adminUser.count({ where: { role: "SUPER" } });
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "Son süper adminin rolü değiştirilemez" },
        { status: 409 }
      );
    }
  }

  if (nextRole) data.role = nextRole;

  const role = data.role ?? existing.role;

  if (body.brandId !== undefined || body.role !== undefined) {
    if (role === "BRAND_MANAGER") {
      const rawBrandId =
        body.brandId !== undefined ? body.brandId : existing.brandId;
      const brandId =
        typeof rawBrandId === "string" && rawBrandId.trim()
          ? rawBrandId.trim()
          : null;

      if (brandId) {
        const brand = await prisma.brand.findUnique({ where: { id: brandId } });
        if (!brand) {
          return NextResponse.json({ error: "Marka bulunamadı" }, { status: 400 });
        }
        data.brand = { connect: { id: brandId } };
      } else {
        data.brand = { disconnect: true };
      }
    } else {
      data.brand = { disconnect: true };
    }
  }

  if (body.permissions !== undefined) {
    if (role === "SUPER") {
      data.permissions = null;
    } else {
      const perms = normalizePermissions(body.permissions);
      if (perms === undefined) {
        return NextResponse.json({ error: "Geçersiz yetki listesi" }, { status: 400 });
      }
      data.permissions =
        perms && perms.length > 0 ? serializePermissions(perms) : null;
    }
  } else if (role === "SUPER" && body.role !== undefined) {
    data.permissions = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  try {
    const user = await prisma.adminUser.update({
      where: { id },
      data,
      include: { brand: { select: { id: true, name: true, slug: true } } },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        brandId: user.brandId,
        brandName: user.brand?.name ?? null,
        brandSlug: user.brand?.slug ?? null,
        permissions: parsePermissionsJson(user.permissions),
        effectivePermissions: getEffectivePermissions(user),
      },
    });
  } catch (err) {
    console.error("PATCH /api/admin/users/[id] failed:", err);
    const message =
      err instanceof Error ? err.message : "Kullanıcı güncellenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;

  if (id === auth.admin.id) {
    return NextResponse.json(
      { error: "Kendi hesabınızı silemezsiniz" },
      { status: 409 }
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  if (existing.role === "SUPER") {
    const superCount = await prisma.adminUser.count({ where: { role: "SUPER" } });
    if (superCount <= 1) {
      return NextResponse.json(
        { error: "Son süper admin silinemez" },
        { status: 409 }
      );
    }
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
