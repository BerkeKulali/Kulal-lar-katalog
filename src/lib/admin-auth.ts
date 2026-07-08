import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AdminPermission } from "@/lib/admin-permissions";
import { hasPermission } from "@/lib/admin-permissions";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const adminId = verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (!adminId) return null;

  return prisma.adminUser.findUnique({
    where: { id: adminId },
    include: { brand: true },
  });
}

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) return null;
  return admin;
}

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await requireAdmin();
  if (!admin) {
    return {
      admin: null as null,
      response: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }),
    };
  }
  if (!hasPermission(admin, permission)) {
    return {
      admin: null as null,
      response: NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      ),
    };
  }
  return { admin, response: null as null };
}
