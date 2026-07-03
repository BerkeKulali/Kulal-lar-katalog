import { v2 as cloudinary } from "cloudinary";

export const CATALOG_IMAGE_ROOT = "kulalilar-katalog";

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function initCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary yapılandırılmamış. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET .env dosyasına ekleyin."
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });

  return cloudinary;
}

export function catalogFolder(brandSlug: string, familySlug?: string) {
  if (familySlug) {
    return `${CATALOG_IMAGE_ROOT}/${brandSlug}/${familySlug}`;
  }
  return `${CATALOG_IMAGE_ROOT}/${brandSlug}`;
}

export function slugifyImageName(filename: string) {
  const base = filename.replace(/\.[^/.]+$/, "").trim() || "gorsel";
  let s = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!s) s = "gorsel";
  if (s.length > 80) s = s.slice(0, 80).replace(/-+$/, "");
  return s;
}

export function isPublicIdConflict(err: unknown) {
  const msg = String(
    (err as { error?: { message?: string } })?.error?.message ??
      (err as Error)?.message ??
      ""
  ).toLowerCase();
  return (
    msg.includes("already exists") ||
    msg.includes("resource with given public id") ||
    (msg.includes("public id") && msg.includes("exists"))
  );
}

export function familyPublicIdVariants(familyName: string, familySlug: string) {
  const variants = new Set<string>();
  const add = (value: string) => {
    const v = value.toLowerCase().trim();
    if (v) variants.add(v);
  };

  add(familySlug);
  add(familyName);
  add(familyName.replace(/\s+/g, "-"));
  add(familyName.replace(/\s+/g, "_"));
  add(familyName.replace(/[^a-z0-9]+/gi, ""));
  add(slugifyImageName(familyName));

  for (const token of familyName.toLowerCase().split(/\s+/).filter(Boolean)) {
    add(token);
    add(slugifyImageName(token));
  }

  return [...variants];
}

export function imageMatchesFamilyPublicId(
  publicId: string,
  familyName: string,
  variants: string[]
) {
  const id = publicId.toLowerCase();
  if (variants.some((v) => id.includes(`/${v}/`) || id.endsWith(`/${v}`))) {
    return true;
  }

  const tokens = familyName
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9ğüşıöç]/gi, ""))
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return false;
  return tokens.every((token) => {
    const slug = slugifyImageName(token);
    return id.includes(token) || id.includes(slug);
  });
}

export function filterImagesForFamily<T extends { public_id?: string }>(
  resources: T[],
  familyName: string,
  variants: string[]
) {
  return resources.filter((r) =>
    imageMatchesFamilyPublicId(String(r.public_id ?? ""), familyName, variants)
  );
}

export async function listCatalogImages(
  prefix: string,
  options?: { maxPages?: number; maxResults?: number }
) {
  const cld = initCloudinary();
  const maxPages = options?.maxPages ?? 10;
  const maxResults = options?.maxResults ?? 200;
  const all: Array<{
    public_id: string;
    secure_url?: string;
    url?: string;
    original_filename?: string;
    bytes?: number;
    width?: number;
    height?: number;
    created_at?: string;
  }> = [];

  let next_cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const batch = await new Promise<{
      resources?: typeof all;
      next_cursor?: string;
    }>((resolve, reject) => {
      cld.api.resources(
        {
          type: "upload",
          resource_type: "image",
          prefix,
          max_results: maxResults,
          ...(next_cursor ? { next_cursor } : {}),
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result as { resources?: typeof all; next_cursor?: string });
        }
      );
    });

    if (Array.isArray(batch.resources)) all.push(...batch.resources);
    next_cursor = batch.next_cursor;
    if (!next_cursor) break;
  }

  all.sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  return all;
}

export async function pingCloudinary() {
  const cld = initCloudinary();
  await new Promise<void>((resolve, reject) => {
    cld.api.ping((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export type CloudinaryImageItem = {
  publicId: string;
  url: string;
  originalFilename: string;
  displayName: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export function toImageItem(r: {
  public_id?: string;
  secure_url?: string;
  url?: string;
  original_filename?: string;
  bytes?: number;
  width?: number;
  height?: number;
  created_at?: string;
}): CloudinaryImageItem {
  const publicId = String(r.public_id ?? "");
  const originalFilename = String(r.original_filename ?? "").trim();
  const displayName =
    originalFilename || publicId.split("/").pop() || "gorsel";

  return {
    publicId,
    url: String(r.secure_url ?? r.url ?? ""),
    originalFilename,
    displayName,
    bytes: typeof r.bytes === "number" ? r.bytes : null,
    width: typeof r.width === "number" ? r.width : null,
    height: typeof r.height === "number" ? r.height : null,
    createdAt: String(r.created_at ?? ""),
  };
}
