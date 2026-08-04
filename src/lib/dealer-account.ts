import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

function normalizeUsername(raw: unknown): string {
  const value = String(raw ?? "").trim().toLowerCase();
  return value;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Bayi kendi başına kayıt olur: isim + kullanıcı adı + şifre. Hesap PENDING
 * olarak oluşturulur — admin onaylayana kadar bu kullanıcı adı/şifre ile
 * giriş yapılamaz (bkz. authenticateDealer).
 */
export async function createDealerAccount(input: {
  name: unknown;
  username: unknown;
  password: unknown;
}) {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) {
    throw new Error("Geçerli bir bayi adı girin");
  }

  const username = normalizeUsername(input.username);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Kullanıcı adı 3-32 karakter olmalı; sadece küçük harf, rakam, nokta, tire ve alt çizgi içerebilir"
    );
  }

  const password = String(input.password ?? "");
  if (password.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalı");
  }

  try {
    const dealer = await prisma.dealer.create({
      data: {
        name,
        username,
        password: hashPassword(password),
        status: "PENDING",
      },
      select: { id: true, name: true, username: true, status: true },
    });
    return dealer;
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new Error("Bu kullanıcı adı zaten kullanılıyor, başka bir tane deneyin");
    }
    throw err;
  }
}

export type DealerAuthResult =
  | { ok: true; dealer: { id: string; name: string } }
  | { ok: false; reason: "invalid" | "pending" | "rejected" | "inactive" };

/**
 * Kullanıcı adı/şifre doğrular. Hesap var olup olmadığını veya şifrenin mi
 * yanlış olduğunu ayırt etmez ("invalid") — yalnızca doğru kimlik bilgisiyle
 * ama henüz onaylanmamış/reddedilmiş/pasif hesaplar için ayrı, bilgilendirici
 * bir sonuç döner (bu iç/güvenilir bir b2b araç; hesap keşfi düşük risk).
 */
export async function authenticateDealer(
  usernameRaw: unknown,
  passwordRaw: unknown
): Promise<DealerAuthResult> {
  const username = normalizeUsername(usernameRaw);
  const password = String(passwordRaw ?? "");

  if (!username || !password) {
    return { ok: false, reason: "invalid" };
  }

  const dealer = await prisma.dealer.findUnique({ where: { username } });
  if (!dealer || !verifyPassword(password, dealer.password)) {
    return { ok: false, reason: "invalid" };
  }

  if (dealer.status === "PENDING") return { ok: false, reason: "pending" };
  if (dealer.status === "REJECTED") return { ok: false, reason: "rejected" };
  if (!dealer.isActive) return { ok: false, reason: "inactive" };

  return { ok: true, dealer: { id: dealer.id, name: dealer.name } };
}

/** Onaylanmış/aktif bir bayi hesabı için yeni bir cihaz (token) oluşturur. */
export async function createDeviceForDealer(dealer: { id: string; name: string }) {
  return prisma.device.create({
    data: {
      dealerId: dealer.id,
      label: `Bayi - ${dealer.name}`,
    },
  });
}

export async function approveDealer(dealerId: string, adminId: string) {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { id: true, status: true },
  });
  if (!dealer) throw new Error("Bayi kaydı bulunamadı");
  if (dealer.status !== "PENDING") throw new Error("Bu talep zaten işlenmiş");

  await prisma.dealer.update({
    where: { id: dealerId },
    data: {
      status: "APPROVED",
      approvedByAdminId: adminId,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });
}

export async function rejectDealer(dealerId: string, adminId: string, reason?: string) {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { id: true, status: true },
  });
  if (!dealer) throw new Error("Bayi kaydı bulunamadı");
  if (dealer.status !== "PENDING") throw new Error("Bu talep zaten işlenmiş");

  const rejectionReason = reason?.trim() ? reason.trim().slice(0, 200) : null;
  await prisma.dealer.update({
    where: { id: dealerId },
    data: {
      status: "REJECTED",
      approvedByAdminId: adminId,
      rejectionReason,
      approvedAt: null,
    },
  });
}
