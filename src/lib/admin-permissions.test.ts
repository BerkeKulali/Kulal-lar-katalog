import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_PERMISSIONS,
  getEffectivePermissions,
  parsePermissionsJson,
  serializePermissions,
} from "@/lib/admin-permissions";

describe("parsePermissionsJson", () => {
  it("geçerli JSON dizisini ayrıştırır", () => {
    assert.deepEqual(parsePermissionsJson('["prices","orders"]'), [
      "prices",
      "orders",
    ]);
  });

  it("bilinmeyen izinleri eler", () => {
    assert.deepEqual(parsePermissionsJson('["prices","uydurma"]'), ["prices"]);
  });

  it("bozuk girdide null döner", () => {
    assert.equal(parsePermissionsJson("bozuk-json"), null);
    assert.equal(parsePermissionsJson('{"a":1}'), null);
    assert.equal(parsePermissionsJson(null), null);
    assert.equal(parsePermissionsJson(""), null);
  });

  it("serializePermissions ile gidiş-dönüş tutarlı", () => {
    const perms = ["prices", "images"] as const;
    assert.deepEqual(parsePermissionsJson(serializePermissions([...perms])), [
      ...perms,
    ]);
  });
});

describe("getEffectivePermissions", () => {
  it("SUPER her zaman tüm izinlere sahiptir", () => {
    assert.deepEqual(
      getEffectivePermissions({ role: "SUPER", permissions: null }),
      [...ADMIN_PERMISSIONS]
    );
  });

  it("SUPER için özel izin listesi yok sayılır", () => {
    assert.deepEqual(
      getEffectivePermissions({ role: "SUPER", permissions: '["prices"]' }),
      [...ADMIN_PERMISSIONS]
    );
  });

  it("BRAND_MANAGER özel listesi varsa onu kullanır", () => {
    assert.deepEqual(
      getEffectivePermissions({
        role: "BRAND_MANAGER",
        permissions: '["prices"]',
      }),
      ["prices"]
    );
  });

  it("BRAND_MANAGER listesi yoksa varsayılana düşer", () => {
    const perms = getEffectivePermissions({
      role: "BRAND_MANAGER",
      permissions: null,
    });
    assert.ok(perms.includes("prices"));
    // "admins" yalnızca SUPER varsayılanında olmalı.
    assert.equal(perms.includes("admins"), false);
  });

  it("boş liste varsayılana düşer", () => {
    const perms = getEffectivePermissions({
      role: "BRAND_MANAGER",
      permissions: "[]",
    });
    assert.ok(perms.length > 0);
  });
});
