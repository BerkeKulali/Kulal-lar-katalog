import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/report-error";

type AuditActor = { id: string; name: string } | null;

type AuditInput = {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Admin denetim izi kaydı. Asla ana işlemi bloklamaz/başarısız etmez —
 * kayıt hatası yalnızca raporlanır. Çağrı await edilebilir ama zorunlu değil.
 */
export async function auditLog(
  actor: AuditActor,
  input: AuditInput
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: actor?.id ?? null,
        adminName: actor?.name ?? "bilinmeyen",
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (err) {
    reportError(err, { where: "auditLog", action: input.action });
  }
}
