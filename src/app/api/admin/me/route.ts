import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getEffectivePermissions, parsePermissionsJson } from "@/lib/admin-permissions";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  return NextResponse.json({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    brandId: admin.brandId,
    brandName: admin.brand?.name ?? null,
    permissions: parsePermissionsJson(admin.permissions),
    effectivePermissions: getEffectivePermissions(admin),
  });
}
