import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aspectForSize,
  formatSizeDisplay,
  getSizesForBrand,
  getSurfacesForBrand,
  isValidSurfaceForBrand,
  normalizeSize,
} from "@/lib/constants";

describe("normalizeSize / formatSizeDisplay", () => {
  it("boşluk ve büyük harfi normalize eder", () => {
    assert.equal(normalizeSize(" 60 X 120 "), "60x120");
    assert.equal(normalizeSize("60X120"), "60x120");
  });

  it("görüntüleme biçimini üretir", () => {
    assert.equal(formatSizeDisplay("60x120"), "60 × 120");
  });
});

describe("aspectForSize", () => {
  it("kare ölçüde 1/1 döner", () => {
    assert.equal(aspectForSize("60x60"), "1/1");
  });

  it("uzun kenarı genişlik kabul eder", () => {
    assert.equal(aspectForSize("60x120"), "120/60");
    assert.equal(aspectForSize("120x60"), "120/60");
  });

  it("geçersiz ölçüde 1/1'e düşer", () => {
    assert.equal(aspectForSize("abc"), "1/1");
  });
});

describe("getSurfacesForBrand", () => {
  it("temel yüzeyleri her markaya verir", () => {
    for (const s of ["MAT", "SLP", "FLP"]) {
      assert.ok(getSurfacesForBrand("qua").includes(s));
    }
  });

  it("markaya özel yüzeyleri ekler", () => {
    assert.ok(getSurfacesForBrand("bien").includes("GLS"));
    assert.ok(getSurfacesForBrand("gural").includes("R11"));
  });

  it("başka markanın özel yüzeyini sızdırmaz", () => {
    assert.equal(getSurfacesForBrand("qua").includes("R11"), false);
    assert.equal(getSurfacesForBrand("qua").includes("GLS"), false);
  });

  it("marka adını büyük/küçük harften bağımsız çözer", () => {
    assert.deepEqual(getSurfacesForBrand("GURAL"), getSurfacesForBrand("gural"));
  });
});

describe("isValidSurfaceForBrand", () => {
  it("markaya uygun yüzeyi kabul eder", () => {
    assert.equal(isValidSurfaceForBrand("gural", "r10"), true);
  });

  it("markaya uygun olmayan yüzeyi reddeder", () => {
    assert.equal(isValidSurfaceForBrand("qua", "R10"), false);
  });
});

describe("getSizesForBrand", () => {
  it("bien'e özel ölçüleri ekler", () => {
    const sizes = getSizesForBrand("bien");
    for (const s of ["45x45", "50x50", "61x61", "120x180"]) {
      assert.ok(sizes.includes(s), `${s} bien'de olmalı`);
    }
  });

  it("diğer markalara özel ölçü sızdırmaz", () => {
    assert.equal(getSizesForBrand("gural").includes("45x45"), false);
  });

  it("ölçüleri tekrarlamaz", () => {
    const sizes = getSizesForBrand("bien");
    assert.equal(new Set(sizes).size, sizes.length);
  });
});
