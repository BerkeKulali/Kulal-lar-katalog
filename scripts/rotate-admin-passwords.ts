/**
 * Tüm admin şifrelerini scrypt hash'e çevirir.
 * Bilinen zayıf/ifşa olmuş şifreler (admin123, qua123) yeni rastgele
 * şifrelerle değiştirilir ve yeni değerler bir kez konsola yazılır.
 *
 * Kullanım: npx tsx scripts/rotate-admin-passwords.ts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, isHashedPassword } from "../src/lib/password";

const COMPROMISED = new Set(["admin123", "qua123"]);

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    return new PrismaClient({
      adapter: new PrismaLibSql({
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }),
    });
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function generatePassword() {
  // Okunması/yazılması kolay, karıştırılabilen karakterler (0/O, 1/l) hariç.
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 14; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main() {
  const prisma = createClient();
  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, password: true },
  });

  console.log(`Veritabanı: ${(process.env.DATABASE_URL ?? "").split("//")[1]?.split(".")[0] ?? "local"}`);
  console.log(`${users.length} admin kullanıcısı bulundu.\n`);

  for (const user of users) {
    if (isHashedPassword(user.password)) {
      console.log(`✓ ${user.email} — zaten hash'li, dokunulmadı`);
      continue;
    }

    if (COMPROMISED.has(user.password)) {
      const newPassword = generatePassword();
      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          password: hashPassword(newPassword),
          passwordChangedAt: new Date(),
        },
      });
      console.log(`★ ${user.email} — YENİ ŞİFRE: ${newPassword}`);
      console.log("  (Bu şifreyi güvenli bir yere kaydedin; tekrar gösterilmeyecek)");
    } else {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { password: hashPassword(user.password) },
      });
      console.log(`✓ ${user.email} — mevcut şifre korunarak hash'lendi`);
    }
  }

  console.log("\nTamamlandı.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
