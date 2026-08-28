import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupDeviceActivity,
  type DeviceActivityRecord,
} from "@/lib/login-activity";

function dev(over: Partial<DeviceActivityRecord> = {}): DeviceActivityRecord {
  return {
    lastSeenAt: new Date("2026-08-28T09:00:00+03:00"),
    dealer: null,
    salesperson: null,
    ...over,
  };
}

describe("groupDeviceActivity", () => {
  it("aynı bayinin birden çok cihazını tek satırda toplar, en son görülmeyi ve cihaz sayısını verir", () => {
    const rows = groupDeviceActivity([
      dev({
        dealer: { id: "d1", name: "Kule Yapı", isActive: true },
        lastSeenAt: new Date("2026-08-28T09:00:00+03:00"),
      }),
      dev({
        dealer: { id: "d1", name: "Kule Yapı", isActive: true },
        lastSeenAt: new Date("2026-08-28T14:30:00+03:00"),
      }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].deviceCount, 2);
    assert.equal(rows[0].lastSeenAt.toISOString(), new Date("2026-08-28T14:30:00+03:00").toISOString());
  });

  it("bayi ve plasiyeri ayrı satırlarda tutar", () => {
    const rows = groupDeviceActivity([
      dev({ dealer: { id: "d1", name: "Kule Yapı", isActive: true } }),
      dev({ salesperson: { id: "s1", name: "Nihal Karcı", isActive: true } }),
    ]);
    assert.equal(rows.length, 2);
    const types = rows.map((r) => r.actorType).sort();
    assert.deepEqual(types, ["dealer", "salesperson"]);
  });

  it("ne bayiye ne plasiyere bağlı cihazları (isimsiz eski kayıtlar) atlar", () => {
    const rows = groupDeviceActivity([dev(), dev()]);
    assert.equal(rows.length, 0);
  });

  it("pasif hesabı da listeler, isActive bilgisini korur", () => {
    const rows = groupDeviceActivity([
      dev({ salesperson: { id: "s1", name: "Eski Plasiyer", isActive: false } }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].isActive, false);
  });

  it("en son görülen üstte olacak şekilde sıralar", () => {
    const rows = groupDeviceActivity([
      dev({
        dealer: { id: "d1", name: "Erken", isActive: true },
        lastSeenAt: new Date("2026-08-28T08:00:00+03:00"),
      }),
      dev({
        salesperson: { id: "s1", name: "Geç", isActive: true },
        lastSeenAt: new Date("2026-08-28T18:00:00+03:00"),
      }),
    ]);
    assert.deepEqual(rows.map((r) => r.name), ["Geç", "Erken"]);
  });
});
