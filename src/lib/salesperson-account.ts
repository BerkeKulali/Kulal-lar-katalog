import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Dealer'daki kullanıcı adı/şifre deseninin plasiyer için birebir aynısı
 * (bkz. src/lib/dealer-account.ts) - farkı, hesabın PENDING/onay akışı
 * olmaması: admin credentials'ı doğrudan atadığında onay zaten verilmiş
 * sayılır. Bu, mevcut isim+admin-onayı+tek-cihaz-kilidi akışına EK, opt-in
 * bir ikinci mod - lockedDeviceId bu modda hiç kullanılmaz, bu yüzden
 * cihaz sayısı sınırlanmaz (bkz. src/lib/device-lock.ts).
 */

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

function normalizeUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Admin bir plasiyere kullanıcı adı/şifre atar (çoklu cihaz modunu açar).
 * Zaten kullanıcı adı/şifresi olan bir plasiyere tekrar çağrılırsa mevcut
 * bilgileri değiştirir (şifre sıfırlama da bu fonksiyonla yapılır).
 */
export async function setSalespersonCredentials(
  salespersonId: string,
  usernameRaw: unknown,
  passwordRaw: unknown
) {
  const username = normalizeUsername(usernameRaw);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Kullanıcı adı 3-32 karakter olmalı; sadece küçük harf, rakam, nokta, tire ve alt çizgi içerebilir"
    );
  }

  const password = String(passwordRaw ?? "");
  if (password.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalı");
  }

  const existing = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new Error("Plasiyer bulunamadı");
  }

  try {
    const salesperson = await prisma.salesperson.update({
      where: { id: salespersonId },
      data: {
        username,
        password: hashPassword(password),
        passwordChangedAt: new Date(),
      },
      select: { id: true, name: true, username: true },
    });
    return salesperson;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new Error("Bu kullanıcı adı zaten kullanılıyor, başka bir tane deneyin");
    }
    throw err;
  }
}

/** Çoklu cihaz modunu kapatır (kullanıcı adı/şifreyi temizler). */
export async function clearSalespersonCredentials(salespersonId: string) {
  await prisma.salesperson.update({
    where: { id: salespersonId },
    data: { username: null, password: null, passwordChangedAt: null },
  });
}

export type SalespersonAuthResult =
  | { ok: true; salesperson: { id: string; name: string } }
  | { ok: false; reason: "invalid" | "inactive" };

/**
 * Kullanıcı adı/şifre doğrular. Hesap var olup olmadığını veya şifrenin mi
 * yanlış olduğunu ayırt etmez ("invalid") - authenticateDealer ile aynı
 * gerekçe (iç/güvenilir bir b2b araç, hesap keşfi düşük risk).
 */
export async function authenticateSalesperson(
  usernameRaw: unknown,
  passwordRaw: unknown
): Promise<SalespersonAuthResult> {
  const username = normalizeUsername(usernameRaw);
  const password = String(passwordRaw ?? "");

  if (!username || !password) {
    return { ok: false, reason: "invalid" };
  }

  const salesperson = await prisma.salesperson.findUnique({ where: { username } });
  if (!salesperson || !salesperson.password || !verifyPassword(password, salesperson.password)) {
    return { ok: false, reason: "invalid" };
  }

  if (!salesperson.isActive) return { ok: false, reason: "inactive" };

  return { ok: true, salesperson: { id: salesperson.id, name: salesperson.name } };
}

/**
 * Kullanıcı adı/şifreyle giriş yapan bir plasiyer için yeni bir cihaz
 * (token) oluşturur. lockedDeviceId'ye BİLEREK dokunulmaz - tek cihaza
 * kilitleme yalnızca eski isim-bazlı akışın parçası; bu fonksiyon her
 * çağrıldığında yeni, kilitlenmemiş bir cihaz eklenir, böylece aynı
 * plasiyer tablet + telefon + ... sınırsız cihazdan giriş yapabilir.
 */
export async function createDeviceForSalesperson(salesperson: {
  id: string;
  name: string;
}) {
  return prisma.device.create({
    data: {
      salespersonId: salesperson.id,
      label: `Plasiyer - ${salesperson.name}`,
    },
  });
}
