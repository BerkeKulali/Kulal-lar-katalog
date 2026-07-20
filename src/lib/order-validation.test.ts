import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderLineLabel,
  MAX_ORDER_LINES,
  MAX_QUANTITY_M2,
  OrderValidationError,
  parseDealerName,
  parseNotes,
  parseOrderItems,
} from "@/lib/order-validation";

function expectError(fn: () => unknown, messagePart: string) {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof OrderValidationError, "OrderValidationError bekleniyordu");
    assert.match(err.message, new RegExp(messagePart, "i"));
    return true;
  });
}

describe("parseOrderItems", () => {
  it("geçerli satırları normalize eder", () => {
    assert.deepEqual(
      parseOrderItems([{ variantId: " v1 ", quantityM2: 12.5 }]),
      [{ variantId: "v1", quantityM2: 12.5 }]
    );
  });

  it("aynı varyantı tek satırda toplar", () => {
    assert.deepEqual(
      parseOrderItems([
        { variantId: "v1", quantityM2: 10 },
        { variantId: "v1", quantityM2: 5 },
      ]),
      [{ variantId: "v1", quantityM2: 15 }]
    );
  });

  it("boş liste kabul etmez", () => {
    expectError(() => parseOrderItems([]), "boş");
    expectError(() => parseOrderItems(null), "boş");
    expectError(() => parseOrderItems("abc"), "boş");
  });

  it("satır sayısı sınırını uygular", () => {
    const tooMany = Array.from({ length: MAX_ORDER_LINES + 1 }, (_, i) => ({
      variantId: `v${i}`,
      quantityM2: 1,
    }));
    expectError(() => parseOrderItems(tooMany), "en fazla");
  });

  // Eski uçta bu değerler doğrudan veritabanına yazılabiliyordu.
  it("negatif, sıfır, NaN ve Infinity miktarları reddeder", () => {
    for (const q of [-5, 0, NaN, Infinity, -Infinity, "abc", null, undefined]) {
      expectError(
        () => parseOrderItems([{ variantId: "v1", quantityM2: q }]),
        "sıfırdan büyük"
      );
    }
  });

  it("üst miktar sınırını uygular", () => {
    expectError(
      () => parseOrderItems([{ variantId: "v1", quantityM2: MAX_QUANTITY_M2 + 1 }]),
      "en fazla"
    );
  });

  it("variantId eksik veya yanlış tipteyse reddeder", () => {
    expectError(() => parseOrderItems([{ quantityM2: 1 }]), "geçersiz");
    expectError(() => parseOrderItems([{ variantId: "  ", quantityM2: 1 }]), "geçersiz");
    expectError(() => parseOrderItems([{ variantId: 42, quantityM2: 1 }]), "geçersiz");
  });

  it("istemcinin gönderdiği fiyat/etiket alanlarını yok sayar", () => {
    const result = parseOrderItems([
      {
        variantId: "v1",
        quantityM2: 3,
        unitPriceSnapshot: 1,
        productLabel: "BEDAVA",
      },
    ]);
    assert.deepEqual(result, [{ variantId: "v1", quantityM2: 3 }]);
  });
});

describe("parseDealerName", () => {
  it("boşlukları sadeleştirir", () => {
    assert.equal(parseDealerName("  Kule   Yapı  "), "Kule Yapı");
  });

  it("çok kısa veya boş adı reddeder", () => {
    expectError(() => parseDealerName("A"), "gerekli");
    expectError(() => parseDealerName("   "), "gerekli");
    expectError(() => parseDealerName(null), "gerekli");
  });

  it("çok uzun adı reddeder", () => {
    expectError(() => parseDealerName("x".repeat(121)), "uzun");
  });
});

describe("parseNotes", () => {
  it("boş notu null'a çevirir", () => {
    assert.equal(parseNotes(""), null);
    assert.equal(parseNotes("   "), null);
    assert.equal(parseNotes(undefined), null);
    assert.equal(parseNotes(123), null);
  });

  it("uzun notu kırpar", () => {
    assert.equal(parseNotes("n".repeat(3000))?.length, 2000);
  });
});

describe("buildOrderLineLabel", () => {
  const base = {
    size: "60x120",
    surface: "MAT",
    quality: "FIRST",
    feature3D: false,
    featureRec: false,
    family: { name: "Kule" },
  };

  it("temel etiketi üretir", () => {
    assert.equal(buildOrderLineLabel(base), "Kule 60X120 MAT 1.");
  });

  it("END kaliteyi işaretler", () => {
    assert.equal(
      buildOrderLineLabel({ ...base, quality: "END" }),
      "Kule 60X120 MAT END"
    );
  });

  it("3D ve REC rozetlerini ekler", () => {
    assert.equal(
      buildOrderLineLabel({ ...base, feature3D: true, featureRec: true }),
      "Kule 60X120 MAT 1. 3D REC"
    );
  });
});
