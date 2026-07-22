import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chunk,
  generateOrderNumber,
  parseKaliteFilter,
  parseQuality,
  parseSurface,
  slugify,
  sortQualities,
} from "@/lib/utils";

describe("chunk", () => {
  it("diziyi eşit parçalara böler", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it("boyut diziden büyükse tek parça döner", () => {
    assert.deepEqual(chunk([1, 2], 10), [[1, 2]]);
  });

  it("boş dizi için boş sonuç", () => {
    assert.deepEqual(chunk([], 3), []);
  });

  it("tam bölünürse artık parça olmaz", () => {
    assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
  });
});

describe("slugify", () => {
  it("Türkçe karakterleri ASCII'ye indirger", () => {
    assert.equal(slugify("Güral Şömine Çiçek"), "gural-somine-cicek");
    assert.equal(slugify("İnci Öz"), "inci-oz");
  });

  it("boşluk ve noktalama yerine tek tire koyar", () => {
    assert.equal(slugify("60x120  --  MAT"), "60x120-mat");
  });

  it("baştaki ve sondaki tireleri temizler", () => {
    assert.equal(slugify("  -Kule-  "), "kule");
  });
});

describe("parseSurface", () => {
  it("doğrudan kodları tanır", () => {
    for (const code of [
      "MAT",
      "SLP",
      "FLP",
      "SGR",
      "GLS",
      "ANTISLIP",
      "R10",
      "R11",
    ]) {
      assert.equal(parseSurface(code), code, `${code} eşleşmeli`);
      assert.equal(parseSurface(code.toLowerCase()), code);
    }
  });

  it("SOFT_ANTISLIP'i boşluk/tire varyantlarıyla tanır", () => {
    assert.equal(parseSurface("SOFT ANTISLIP"), "SOFT_ANTISLIP");
    assert.equal(parseSurface("soft-antislip"), "SOFT_ANTISLIP");
    assert.equal(parseSurface("Soft Anti Slip"), "SOFT_ANTISLIP");
  });

  it("R10/R11'i antislip ile birlikte geçtiğinde önceler", () => {
    assert.equal(parseSurface("ANTISLIP R11"), "R11");
    assert.equal(parseSurface("ANTISLIP R10"), "R10");
  });

  it("açıklayıcı Türkçe/İngilizce adları eşler", () => {
    assert.equal(parseSurface("Parlak"), "GLS");
    assert.equal(parseSurface("Gloss"), "GLS");
    assert.equal(parseSurface("Sugar"), "SGR");
    assert.equal(parseSurface("Semi Lappato"), "SLP");
    assert.equal(parseSurface("Full Lappato"), "FLP");
  });

  it("tanımadığı değer için null döner", () => {
    assert.equal(parseSurface("bilinmeyen"), null);
    assert.equal(parseSurface(""), null);
  });
});

describe("parseQuality / parseKaliteFilter", () => {
  it("1. kalite varyantlarını tanır", () => {
    for (const v of ["1", "1.", "FIRST", "birinci", "1.kalite"]) {
      assert.equal(parseQuality(v), "FIRST", `${v} FIRST olmalı`);
    }
  });

  it("END kalite varyantlarını tanır", () => {
    for (const v of ["END", "2", "2.", "2.kalite"]) {
      assert.equal(parseQuality(v), "END", `${v} END olmalı`);
    }
  });

  it("filtrede 'tumu' değerini ALL'a çevirir", () => {
    assert.equal(parseKaliteFilter("tumu"), "ALL");
    assert.equal(parseKaliteFilter("TÜMÜ"), "ALL");
  });

  it("parametre yokken FIRST'e düşer", () => {
    assert.equal(parseKaliteFilter(undefined), "FIRST");
    assert.equal(parseKaliteFilter(""), "FIRST");
    assert.equal(parseKaliteFilter("anlamsiz"), "FIRST");
  });
});

describe("sortQualities", () => {
  it("önce FIRST sonra END sıralar", () => {
    assert.deepEqual(sortQualities(["END", "FIRST"]), ["FIRST", "END"]);
  });

  it("girdiyi değiştirmez", () => {
    const input = ["END", "FIRST"];
    sortQualities(input);
    assert.deepEqual(input, ["END", "FIRST"]);
  });
});

describe("generateOrderNumber", () => {
  it("SIP-<14 hane>-<6 karakter> biçiminde üretir", () => {
    assert.match(generateOrderNumber(), /^SIP-\d{14}-[A-Z2-9]{6}$/);
  });

  it("karışabilen karakterleri (I, O, 0, 1) kullanmaz", () => {
    for (let i = 0; i < 200; i += 1) {
      const suffix = generateOrderNumber().split("-")[2];
      assert.ok(!/[IO01]/.test(suffix), `sonek karışabilir karakter içeriyor: ${suffix}`);
    }
  });

  it("aynı saniyede üretilen numaralar çakışmaz", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) seen.add(generateOrderNumber());
    assert.equal(seen.size, 500);
  });
});
