import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPackCount,
  formatPackMultiplier,
  packCount,
  palletVisualState,
  quantityForSaleMode,
  quantizePalletFill,
} from "@/lib/packaging";

describe("packCount", () => {
  it("tam bölünen miktarı hesaplar", () => {
    assert.equal(packCount(50, 10), 5);
  });

  it("ondalığı tek haneye yuvarlar", () => {
    assert.equal(packCount(52, 10), 5.2);
    assert.equal(packCount(52.7, 10), 5.3);
  });

  it("geçersiz birimde null döner", () => {
    assert.equal(packCount(50, 0), null);
    assert.equal(packCount(50, null), null);
    assert.equal(packCount(50, undefined), null);
    assert.equal(packCount(0, 10), null);
  });
});

describe("formatPackCount / formatPackMultiplier", () => {
  it("tam sayıda ondalık göstermez", () => {
    assert.equal(formatPackCount(5), "5");
    assert.equal(formatPackMultiplier(5), "5x");
  });

  it("ondalıkta Türkçe virgül kullanır", () => {
    assert.equal(formatPackCount(5.5), "5,5");
    assert.equal(formatPackMultiplier(5.5), "5,5x");
  });

  it("değer yoksa tire gösterir", () => {
    assert.equal(formatPackCount(null), "—");
  });
});

describe("quantizePalletFill", () => {
  it("sınırları kırpar", () => {
    assert.equal(quantizePalletFill(-1), 0);
    assert.equal(quantizePalletFill(0), 0);
    assert.equal(quantizePalletFill(1), 1);
    assert.equal(quantizePalletFill(2), 1);
  });

  it("30 kademeye yuvarlar", () => {
    assert.equal(quantizePalletFill(0.5), 15 / 30);
    assert.ok(Math.abs(quantizePalletFill(0.51) - 15 / 30) < 1e-9);
  });
});

describe("palletVisualState", () => {
  it("palet bilgisi yoksa null döner", () => {
    assert.equal(palletVisualState(10, null), null);
    assert.equal(palletVisualState(10, 0), null);
  });

  it("sıfır miktarda boş palet döner", () => {
    assert.deepEqual(palletVisualState(0, 50), {
      fill: 0,
      multiplier: null,
      label: null,
    });
  });

  it("tam palette çarpan etiketi verir", () => {
    const state = palletVisualState(250, 50);
    assert.equal(state?.fill, 1);
    assert.equal(state?.multiplier, 5);
    assert.equal(state?.label, "5x");
  });

  it("kısmi palette etiket vermez", () => {
    const state = palletVisualState(25, 50);
    assert.equal(state?.multiplier, null);
    assert.equal(state?.label, null);
    assert.ok(state && state.fill > 0 && state.fill < 1);
  });

  // Kayan nokta hatası tam paleti "eksik" göstermemeli.
  it("kayan nokta toleransını uygular", () => {
    const state = palletVisualState(49.999, 50);
    assert.equal(state?.fill, 1);
    assert.equal(state?.multiplier, 1);
  });
});

describe("quantityForSaleMode", () => {
  it("m2 modunda miktarı değiştirmez", () => {
    assert.equal(quantityForSaleMode(37, "m2", 50, 1000), 37);
  });

  it("palet modunda yukarı yuvarlar", () => {
    assert.equal(quantityForSaleMode(37, "pallet", 50, 1000), 50);
    assert.equal(quantityForSaleMode(51, "pallet", 50, 1000), 100);
  });

  it("tır modunda yukarı yuvarlar", () => {
    assert.equal(quantityForSaleMode(1200, "truck", 50, 1000), 2000);
  });

  it("birim tanımsızsa miktarı olduğu gibi bırakır", () => {
    assert.equal(quantityForSaleMode(37, "pallet", null, null), 37);
    assert.equal(quantityForSaleMode(37, "truck", 50, 0), 37);
  });
});
