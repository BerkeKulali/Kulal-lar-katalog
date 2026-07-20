import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import {
  createAdminSessionValue,
  isSessionCurrent,
  isSessionSecretConfigured,
  verifyAdminSessionClaims,
  verifyAdminSessionValue,
} from "@/lib/admin-session";

const SECRET = "test-secret-that-is-long-enough-for-hmac-32";
const PWD_CHANGED = new Date("2026-01-01T00:00:00.000Z");

before(() => {
  process.env.SESSION_SECRET = SECRET;
});

describe("SESSION_SECRET yapılandırması", () => {
  it("tanımlıysa yapılandırılmış sayar", () => {
    assert.equal(isSessionSecretConfigured(), true);
  });

  it("tanımlı değilse yapılandırılmamış sayar", () => {
    delete process.env.SESSION_SECRET;
    assert.equal(isSessionSecretConfigured(), false);
    process.env.SESSION_SECRET = SECRET;
  });

  it("çok kısa sırrı reddeder", () => {
    process.env.SESSION_SECRET = "kisa";
    assert.equal(isSessionSecretConfigured(), false);
    process.env.SESSION_SECRET = SECRET;
  });

  // Eskiden DATABASE_AUTH_TOKEN'a düşülüyordu; artık düşülmemeli.
  it("DATABASE_AUTH_TOKEN'a geri düşmez", () => {
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_AUTH_TOKEN = "x".repeat(64);
    assert.equal(isSessionSecretConfigured(), false);
    delete process.env.DATABASE_AUTH_TOKEN;
    process.env.SESSION_SECRET = SECRET;
  });
});

describe("oturum imzalama ve doğrulama", () => {
  it("ürettiği token'ı doğrular", () => {
    const value = createAdminSessionValue("admin-1", 3600, PWD_CHANGED);
    assert.equal(verifyAdminSessionValue(value), "admin-1");
  });

  it("boş/bozuk değerleri reddeder", () => {
    assert.equal(verifyAdminSessionValue(undefined), null);
    assert.equal(verifyAdminSessionValue(""), null);
    assert.equal(verifyAdminSessionValue("cop"), null);
    assert.equal(verifyAdminSessionValue("a.b.c"), null);
  });

  // admin-access.ts eskiden yalnızca cookie'nin varlığına bakıyordu.
  it("uydurma cookie değerini kabul etmez", () => {
    assert.equal(verifyAdminSessionValue("admin-1.9999999999.0.deadbeef"), null);
  });

  it("imza kurcalanmışsa reddeder", () => {
    const value = createAdminSessionValue("admin-1", 3600, PWD_CHANGED);
    const parts = value.split(".");
    const tampered = ["admin-2", parts[1], parts[2], parts[3]].join(".");
    assert.equal(verifyAdminSessionValue(tampered), null);
  });

  it("süresi dolmuş token'ı reddeder", () => {
    const expired = createAdminSessionValue("admin-1", -10, PWD_CHANGED);
    assert.equal(verifyAdminSessionValue(expired), null);
  });

  it("farklı sırla imzalanmış token'ı reddeder", () => {
    const value = createAdminSessionValue("admin-1", 3600, PWD_CHANGED);
    process.env.SESSION_SECRET = "another-secret-long-enough-for-hmac-32x";
    assert.equal(verifyAdminSessionValue(value), null);
    process.env.SESSION_SECRET = SECRET;
  });
});

describe("şifre değişikliğiyle oturum iptali", () => {
  it("passwordChangedAt aynıysa oturum geçerlidir", () => {
    const value = createAdminSessionValue("admin-1", 3600, PWD_CHANGED);
    const claims = verifyAdminSessionClaims(value);
    assert.ok(claims);
    assert.equal(isSessionCurrent(claims, PWD_CHANGED), true);
  });

  it("şifre değiştiyse eldeki token geçersizleşir", () => {
    const value = createAdminSessionValue("admin-1", 3600, PWD_CHANGED);
    const claims = verifyAdminSessionClaims(value);
    assert.ok(claims);
    const changed = new Date(PWD_CHANGED.getTime() + 60_000);
    assert.equal(isSessionCurrent(claims, changed), false);
  });
});
