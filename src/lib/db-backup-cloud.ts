import {
  CATALOG_IMAGE_ROOT,
  initCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import type { DbBackupManifest } from "@/lib/db-backup";
import { backupTimestamp } from "@/lib/db-backup";

export const DB_BACKUP_FOLDER = `${CATALOG_IMAGE_ROOT}/db-backups`;
const KEEP_CLOUD_BACKUPS = 30;

export type CloudBackupEntry = {
  publicId: string;
  url: string;
  createdAt: string;
  bytes: number;
};

export async function uploadBackupToCloudinary(
  manifest: DbBackupManifest,
  label: string
) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary yapilandirilmamis.");
  }

  const cld = initCloudinary();
  const json = JSON.stringify(manifest);
  const publicId = `db-${label}-${backupTimestamp()}`;

  const result = await cld.uploader.upload(
    `data:application/json;base64,${Buffer.from(json, "utf8").toString("base64")}`,
    {
      resource_type: "raw",
      folder: DB_BACKUP_FOLDER,
      public_id: publicId,
      overwrite: false,
    }
  );

  await pruneOldCloudBackups();

  return {
    publicId: result.public_id,
    url: result.secure_url,
    bytes: result.bytes,
    createdAt: result.created_at,
  };
}

export async function listCloudBackups(limit = 10): Promise<CloudBackupEntry[]> {
  if (!isCloudinaryConfigured()) return [];

  const cld = initCloudinary();
  const result = await cld.api.resources({
    type: "upload",
    resource_type: "raw",
    prefix: DB_BACKUP_FOLDER,
    max_results: Math.min(limit, 50),
    direction: "desc",
  });

  const resources = (result.resources ?? []) as Array<{
    public_id: string;
    secure_url: string;
    created_at: string;
    bytes: number;
  }>;

  return resources
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      createdAt: r.created_at,
      bytes: r.bytes,
    }));
}

async function pruneOldCloudBackups() {
  const cld = initCloudinary();
  const result = await cld.api.resources({
    type: "upload",
    resource_type: "raw",
    prefix: DB_BACKUP_FOLDER,
    max_results: 100,
  });

  const resources = (result.resources ?? []) as Array<{
    public_id: string;
    created_at: string;
  }>;

  const sorted = resources.sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const item of sorted.slice(KEEP_CLOUD_BACKUPS)) {
    await cld.uploader.destroy(item.public_id, { resource_type: "raw" });
  }
}
