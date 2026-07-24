import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actorDisplayName,
  actorTypeLabel,
  aggregateClickEvents,
  displayDay,
  istanbulDayKey,
  parseDimensions,
  type ClickEventForReport,
} from "@/lib/click-report-shared";

function ev(
  over: Partial<ClickEventForReport> = {}
): ClickEventForReport {
  return {
    familyName: "Carmen",
    brandName: "Güral",
    actorType: "dealer",
    actorName: "Kule Yapı",
    count: 1,
    createdAt: new Date("2026-07-20T12:00:00+03:00"),
    ...over,
  };
}

describe("parseDimensions", () => {
  it("geçerli boyutları ayrıştırır", () => {
    assert.deepEqual(parseDimensions("product,actor"), ["product", "actor"]);
    assert.deepEqual(parseDimensions("date"), ["date"]);
  });
  it("bilinmeyenleri eler, boşsa product'a düşer", () => {
    assert.deepEqual(parseDimensions("x,product,y"), ["product"]);
    assert.deepEqual(parseDimensions(""), ["product"]);
    assert.deepEqual(parseDimensions(null), ["product"]);
  });
});

describe("actorTypeLabel / actorDisplayName", () => {
  it("tür etiketi", () => {
    assert.equal(actorTypeLabel("dealer"), "Bayi");
    assert.equal(actorTypeLabel("salesperson"), "Plasiyer");
    assert.equal(actorTypeLabel("unknown"), "—");
  });
  it("ad yoksa türe göre yer tutucu", () => {
    assert.equal(actorDisplayName("dealer", null), "Bilinmeyen bayi");
    assert.equal(actorDisplayName("salesperson", null), "Bilinmeyen plasiyer");
    assert.equal(actorDisplayName("dealer", "Ahmet"), "Ahmet");
  });
});

describe("istanbulDayKey / displayDay", () => {
  it("İstanbul gününe göre anahtar", () => {
    // 2026-07-20 21:30 UTC = 2026-07-21 00:30 İstanbul (UTC+3)
    assert.equal(istanbulDayKey(new Date("2026-07-20T21:30:00Z")), "2026-07-21");
  });
  it("gösterim biçimi", () => {
    assert.equal(displayDay("2026-07-21"), "21.07.2026");
  });
});

describe("aggregateClickEvents", () => {
  it("ürün bazında toplar ve sayıya göre sıralar", () => {
    const { rows, total } = aggregateClickEvents(
      [
        ev({ familyName: "A", count: 2 }),
        ev({ familyName: "B", count: 6 }),
        ev({ familyName: "A", count: 3 }),
      ],
      ["product"]
    );
    assert.equal(total, 11);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].product, "B · Güral"); // en yüksek önce (6)
    assert.equal(rows[0].count, 6);
    assert.equal(rows[1].product, "A · Güral"); // 2 + 3 = 5
    assert.equal(rows[1].count, 5);
  });

  it("aktör bazında bayi/plasiyer ayrımı yapar", () => {
    const { rows } = aggregateClickEvents(
      [
        ev({ actorType: "dealer", actorName: "Kule", count: 4 }),
        ev({ actorType: "salesperson", actorName: "Ahmet", count: 1 }),
        ev({ actorType: "dealer", actorName: "Kule", count: 2 }),
      ],
      ["actor"]
    );
    const kule = rows.find((r) => r.actor === "Kule");
    assert.equal(kule?.count, 6);
    assert.equal(kule?.actorType, "dealer");
    assert.equal(rows.find((r) => r.actor === "Ahmet")?.actorType, "salesperson");
  });

  it("ürün + tarih birlikte kırılım", () => {
    const { rows } = aggregateClickEvents(
      [
        ev({ familyName: "A", createdAt: new Date("2026-07-20T10:00:00+03:00"), count: 1 }),
        ev({ familyName: "A", createdAt: new Date("2026-07-20T18:00:00+03:00"), count: 2 }),
        ev({ familyName: "A", createdAt: new Date("2026-07-21T10:00:00+03:00"), count: 1 }),
      ],
      ["product", "date"]
    );
    // Aynı gün + aynı ürün birleşir → 2 satır (20'sinde 3, 21'inde 1)
    assert.equal(rows.length, 2);
    assert.equal(rows[0].count, 3);
    assert.equal(rows[0].date, "20.07.2026");
  });

  it("boyut seçilmeyen alan null olur", () => {
    const { rows } = aggregateClickEvents([ev()], ["product"]);
    assert.equal(rows[0].date, null);
    assert.equal(rows[0].actor, null);
    assert.equal(rows[0].actorType, null);
  });
});
