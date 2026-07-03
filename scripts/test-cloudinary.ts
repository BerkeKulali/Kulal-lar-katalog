import "dotenv/config";
import {
  CATALOG_IMAGE_ROOT,
  initCloudinary,
  isCloudinaryConfigured,
  listCatalogImages,
} from "../src/lib/cloudinary";

async function main() {
  console.log("Cloudinary bağlantı testi...\n");

  if (!isCloudinaryConfigured()) {
    console.error("HATA: .env dosyasında Cloudinary değişkenleri eksik.");
    console.error("Gerekli:");
    console.error("  CLOUDINARY_CLOUD_NAME");
    console.error("  CLOUDINARY_API_KEY");
    console.error("  CLOUDINARY_API_SECRET");
    process.exit(1);
  }

  initCloudinary();
  const resources = await listCatalogImages(CATALOG_IMAGE_ROOT);

  console.log("OK — Bağlantı başarılı");
  console.log(`Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`Klasör: ${CATALOG_IMAGE_ROOT}`);
  console.log(`Bu klasörde ${resources.length} görsel bulundu.`);
}

main().catch((e) => {
  console.error("HATA:", e.message ?? e);
  process.exit(1);
});
