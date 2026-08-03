import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyProductFilter,
  type FilterCriteria,
  type VariantForFilter,
} from "@/lib/campaign-filter";

function v(overrides: Partial<VariantForFilter>): VariantForFilter {
  return {
    variantId: "v1",
    familyId: "f1",
    familyName: "Aile",
    brandId: "b1",
    brandName: "Marka",
    materialType: null,
    size: "60x60",
    surface: "MAT",
    quality: "FIRST",
    stockM2: 0,
    ...overrides,
  };
}

function criteria(overrides: Partial<FilterCriteria>): FilterCriteria {
  return {
    brandIds: [],
    materialType: null,
    quality: null,
    basis: "variant",
    direction: "under",
    thresholdM2: 250,
    ...overrides,
  };
}

describe("applyProductFilter", () => {
  it("basis=variant, direction=under: eşiğin altındaki varyantları döner", () => {
    const variants = [
      v({ variantId: "a", familyId: "fa", stockM2: 100 }),
      v({ variantId: "b", familyId: "fb", stockM2: 250 }), // eşit → dahil değil
      v({ variantId: "c", familyId: "fc", stockM2: 400 }),
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ basis: "variant", direction: "under", thresholdM2: 250 })
    );
    assert.deepEqual(
      rows.map((r) => r.variantId),
      ["a"]
    );
    assert.equal(rows[0].familyTotalStockM2, 100);
  });

  it("basis=variant, direction=over: eşit ve üstünü döner (dahil)", () => {
    const variants = [
      v({ variantId: "a", stockM2: 999 }),
      v({ variantId: "b", stockM2: 1000 }), // eşit → dahil
      v({ variantId: "c", stockM2: 1500 }),
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ basis: "variant", direction: "over", thresholdM2: 1000 })
    );
    assert.deepEqual(
      rows.map((r) => r.variantId).sort(),
      ["b", "c"]
    );
  });

  it("basis=family: aile toplamı eşiği geçerse ailenin tüm varyantları döner", () => {
    const variants = [
      v({ variantId: "a", familyId: "f1", stockM2: 100 }),
      v({ variantId: "b", familyId: "f1", stockM2: 80 }), // toplam f1 = 180
      v({ variantId: "c", familyId: "f2", stockM2: 300 }), // toplam f2 = 300
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ basis: "family", direction: "under", thresholdM2: 250 })
    );
    // f1 toplamı (180) eşiğin altında → a ve b dahil; f2 (300) değil.
    assert.deepEqual(
      rows.map((r) => r.variantId).sort(),
      ["a", "b"]
    );
    assert.equal(rows[0].familyTotalStockM2, 180);
    assert.equal(rows[1].familyTotalStockM2, 180);
  });

  it("marka filtresi eşleşmeyenleri eler", () => {
    const variants = [
      v({ variantId: "a", brandId: "gural", stockM2: 100 }),
      v({ variantId: "b", brandId: "bien", stockM2: 100 }),
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ brandIds: ["gural"], basis: "variant", direction: "under", thresholdM2: 500 })
    );
    assert.deepEqual(
      rows.map((r) => r.variantId),
      ["a"]
    );
  });

  it("malzeme tipi ve kalite filtresi birlikte uygulanır", () => {
    const variants = [
      v({ variantId: "a", materialType: "ahsap", quality: "END", stockM2: 100 }),
      v({ variantId: "b", materialType: "ahsap", quality: "FIRST", stockM2: 100 }),
      v({ variantId: "c", materialType: "mermer", quality: "END", stockM2: 100 }),
    ];
    const rows = applyProductFilter(
      variants,
      criteria({
        materialType: "ahsap",
        quality: "END",
        basis: "variant",
        direction: "under",
        thresholdM2: 500,
      })
    );
    assert.deepEqual(
      rows.map((r) => r.variantId),
      ["a"]
    );
  });

  it("hiçbir varyant kriterlere uymazsa boş sonuç döner", () => {
    const rows = applyProductFilter(
      [v({ stockM2: 1000 })],
      criteria({ basis: "variant", direction: "under", thresholdM2: 250 })
    );
    assert.deepEqual(rows, []);
  });

  it("basis=variant iken de familyTotalStockM2 bilgi amaçlı hesaplanır", () => {
    const variants = [
      v({ variantId: "a", familyId: "f1", stockM2: 100 }),
      v({ variantId: "b", familyId: "f1", stockM2: 5000 }), // eşiği geçmez, ama toplama dahil
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ basis: "variant", direction: "under", thresholdM2: 250 })
    );
    // Sadece "a" eşiğin altında (kendi stoğu 100), ama aile toplamı (5100)
    // bilgi amaçlı satırda görünür.
    assert.deepEqual(
      rows.map((r) => r.variantId),
      ["a"]
    );
    assert.equal(rows[0].familyTotalStockM2, 5100);
  });

  it("basis=family: aile toplamı tam eşiğe eşitse 'altı' filtresine dahil olmaz", () => {
    const variants = [
      v({ variantId: "a", familyId: "f1", stockM2: 150 }),
      v({ variantId: "b", familyId: "f1", stockM2: 100 }), // toplam = 250
    ];
    const rows = applyProductFilter(
      variants,
      criteria({ basis: "family", direction: "under", thresholdM2: 250 })
    );
    assert.deepEqual(rows, []);
  });
});
