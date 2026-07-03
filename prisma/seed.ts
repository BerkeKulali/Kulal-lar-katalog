import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Quality, Surface } from "../src/generated/prisma/client";

function createSeedClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    return new PrismaClient({
      adapter: new PrismaLibSql({
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }),
    });
  }
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

const prisma = createSeedClient();

const TILE_COLORS: Record<string, string> = {
  "ARK-IVORY": "#e8e0d4",
  "PASTEL-SAGE": "#9aab8c",
  "CREMA-TRAVERTINO": "#c4b09a",
  "CORE-IVORY": "#ebe4d8",
  "STARK-GREY": "#8a8a8a",
  "TREND-WOOD-NATURAL": "#c9b896",
  "SOUND-GREY": "#9a9a9a",
  "VEGA-TAUPE": "#8b7d72",
};

type VariantSeed = {
  size: string;
  surface: Surface;
  quality: Quality;
  price: number;
  code?: string;
  palletM2?: number;
  boxM2?: number;
  truckM2?: number;
  stock?: { label: string; quantityM2: number }[];
};

type FamilySeed = {
  name: string;
  variants: VariantSeed[];
};

const QUA_FAMILIES: FamilySeed[] = [
  {
    name: "ARK-IVORY",
    variants: [
      {
        size: "60x120",
        surface: "MAT",
        quality: "FIRST",
        price: 410,
        code: "ARK-IVORY MAT 1.",
        stock: [{ label: "Depo", quantityM2: 1200 }],
      },
      {
        size: "60x120",
        surface: "SLP",
        quality: "FIRST",
        price: 430,
        code: "ARK-IVORY SLP 1.",
        stock: [{ label: "Depo", quantityM2: 800 }],
      },
      {
        size: "60x120",
        surface: "FLP",
        quality: "FIRST",
        price: 470,
        code: "ARK-IVORY FLP 1.",
        palletM2: 51.84,
        boxM2: 1.44,
        truckM2: 1200,
        stock: [{ label: "SÖKE FABRİKA SEVK", quantityM2: 500 }],
      },
      {
        size: "60x120",
        surface: "MAT",
        quality: "END",
        price: 250,
        code: "ARK-IVORY MAT END.",
        stock: [{ label: "Depo", quantityM2: 386 }],
      },
      {
        size: "80x80",
        surface: "MAT",
        quality: "FIRST",
        price: 280,
        code: "ARK-IVORY MAT 1.",
        stock: [{ label: "Depo", quantityM2: 2099 }],
      },
      {
        size: "80x80",
        surface: "MAT",
        quality: "END",
        price: 250,
        code: "ARK-IVORY MAT END.",
        stock: [{ label: "Depo", quantityM2: 450 }],
      },
    ],
  },
  {
    name: "PASTEL-SAGE",
    variants: [
      {
        size: "60x120",
        surface: "FLP",
        quality: "END",
        price: 310,
        code: "PASTEL-SAGE FLP END.",
        stock: [{ label: "Depo", quantityM2: 1000 }],
      },
    ],
  },
  {
    name: "CREMA-TRAVERTINO",
    variants: [
      {
        size: "60x120",
        surface: "SLP",
        quality: "END",
        price: 330,
        code: "CREMA-TRAVERTINO SEMİ LAPP. END.",
        stock: [{ label: "Depo", quantityM2: 1231 }],
      },
    ],
  },
  {
    name: "CORE-IVORY",
    variants: [
      {
        size: "80x80",
        surface: "MAT",
        quality: "FIRST",
        price: 280,
        code: "CORE-IVORY MAT 1.",
        stock: [{ label: "Depo", quantityM2: 6552.8 }],
      },
      {
        size: "80x80",
        surface: "MAT",
        quality: "END",
        price: 250,
        code: "CORE-IVORY REC END.",
        stock: [{ label: "Depo", quantityM2: 1689 }],
      },
    ],
  },
  {
    name: "STARK-GREY",
    variants: [
      {
        size: "80x80",
        surface: "MAT",
        quality: "FIRST",
        price: 280,
        code: "STARK-GREY MAT 1.",
        stock: [{ label: "Depo", quantityM2: 3803.8 }],
      },
    ],
  },
  {
    name: "TREND-WOOD-NATURAL",
    variants: [
      {
        size: "20x120",
        surface: "MAT",
        quality: "FIRST",
        price: 350,
        code: "TREND-WOOD-NATURAL REC 1.",
        stock: [{ label: "Depo", quantityM2: 4267 }],
      },
      {
        size: "20x120",
        surface: "MAT",
        quality: "END",
        price: 250,
        code: "TREND-WOOD-OAK REC END.",
        stock: [{ label: "Depo", quantityM2: 69 }],
      },
    ],
  },
  {
    name: "SOUND-GREY",
    variants: [
      {
        size: "30x90",
        surface: "MAT",
        quality: "FIRST",
        price: 210,
        code: "SOUND-GREY REC 1.",
        stock: [{ label: "Depo", quantityM2: 68 }],
      },
    ],
  },
  {
    name: "VEGA-TAUPE",
    variants: [
      {
        size: "30x90",
        surface: "MAT",
        quality: "FIRST",
        price: 240,
        code: "VEGA-TAUPE REC 1.",
        stock: [{ label: "Depo", quantityM2: 98 }],
      },
    ],
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedBrandFamilies(
  brandId: string,
  families: FamilySeed[],
  sortOffset = 0
) {
  for (const [index, family] of families.entries()) {
    const color = TILE_COLORS[family.name] ?? "#888888";
    const created = await prisma.productFamily.create({
      data: {
        brandId,
        name: family.name,
        slug: slugify(family.name),
        imageUrl: `color:${color}`,
        sortOrder: sortOffset + index,
      },
    });

    for (const variant of family.variants) {
      await prisma.productVariant.create({
        data: {
          familyId: created.id,
          size: variant.size,
          surface: variant.surface,
          quality: variant.quality,
          price: variant.price,
          code: variant.code,
          palletM2: variant.palletM2,
          boxM2: variant.boxM2,
          truckM2: variant.truckM2,
          imageUrl: `color:${color}`,
          stockLines: variant.stock
            ? { create: variant.stock }
            : undefined,
        },
      });
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const target = url.startsWith("libsql://") || url.startsWith("https://")
    ? "Turso (uzak)"
    : `Yerel SQLite (${url})`;
  console.log(`Seed hedefi: ${target}`);

  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockLine.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productFamily.deleteMany();
  await prisma.device.deleteMany();
  await prisma.salesperson.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.brand.deleteMany();

  const brands = await Promise.all([
    prisma.brand.create({
      data: { name: "QUA SERAMİK", slug: "qua", logoText: "QUA", sortOrder: 0 },
    }),
    prisma.brand.create({
      data: { name: "BIEN", slug: "bien", logoText: "BIEN", sortOrder: 1 },
    }),
    prisma.brand.create({
      data: { name: "GÜRAL", slug: "gural", logoText: "GÜRAL", sortOrder: 2 },
    }),
    prisma.brand.create({
      data: { name: "KALE", slug: "kale", logoText: "KALE", sortOrder: 3 },
    }),
  ]);

  await seedBrandFamilies(brands[0].id, QUA_FAMILIES);

  const salespeople = await Promise.all([
    prisma.salesperson.create({ data: { name: "Ahmet Yılmaz" } }),
    prisma.salesperson.create({ data: { name: "Mehmet Demir" } }),
    prisma.salesperson.create({ data: { name: "Ayşe Kaya" } }),
  ]);

  await prisma.adminUser.create({
    data: {
      email: "admin@kulalilar.com",
      name: "Süper Admin",
      password: "admin123",
      role: "SUPER",
    },
  });

  await prisma.adminUser.create({
    data: {
      email: "qua@kulalilar.com",
      name: "QUA Sorumlusu",
      password: "qua123",
      role: "BRAND_MANAGER",
      brandId: brands[0].id,
    },
  });

  await prisma.announcement.create({
    data: {
      title: "QUA fiyat listesi güncellendi",
      body: "60x120 ve 80x80 serilerinde güncel fiyatlar yayında.",
      sortOrder: 0,
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { lastPriceListUpdate: new Date() },
    create: { id: "default", lastPriceListUpdate: new Date() },
  });

  console.log("Seed tamamlandı.");
  console.log("Admin: admin@kulalilar.com / admin123");
  console.log("Pazarlamacılar:", salespeople.map((s) => s.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
