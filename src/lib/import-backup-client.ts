export type ImportBackupResult = {
  ok: boolean;
  summary?: {
    variants: number;
    families: number;
    salespeople: string[];
  };
  backup?: {
    publicId: string;
    url: string;
    createdAt: string;
  };
  error?: string;
};

export async function createPreImportBackup(
  reason: string
): Promise<ImportBackupResult> {
  const res = await fetch("/api/admin/import/pre-backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? "Yedek alınamadı",
      summary: data.summary,
    };
  }

  return {
    ok: true,
    summary: data.summary,
    backup: data.backup,
  };
}
