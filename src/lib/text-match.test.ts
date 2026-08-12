import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { turkishFold, turkishIncludes } from "@/lib/text-match";

describe("turkishFold", () => {
  it("Türkçe İ/I/i/ı varyantlarının hepsini tek 'i'ye indirger", () => {
    assert.equal(turkishFold("SİDE"), "side");
    assert.equal(turkishFold("SIDE"), "side");
    assert.equal(turkishFold("side"), "side");
    assert.equal(turkishFold("sıde"), "side");
  });

  it("İNCA / INCA / inca / ınca hepsi aynı sonuca katlanır", () => {
    const expected = "inca";
    assert.equal(turkishFold("İNCA"), expected);
    assert.equal(turkishFold("INCA"), expected);
    assert.equal(turkishFold("inca"), expected);
    assert.equal(turkishFold("ınca"), expected);
  });

  it("diğer Türkçe harfleri (Ç/Ş/Ğ/Ö/Ü) bozmadan küçültür", () => {
    assert.equal(turkishFold("ÇAĞLA GÖKÇEN ŞÜKRÜ"), "çağla gökçen şükrü");
  });
});

describe("turkishIncludes", () => {
  it("veride Türkçe noktalı İ ile kayıtlı ad, ASCII yazımla aranınca bulunur", () => {
    assert.equal(turkishIncludes("SİDE", "Side"), true);
    assert.equal(turkishIncludes("SİDE", "SIDE"), true);
    assert.equal(turkishIncludes("SİDE", "side"), true);
    assert.equal(turkishIncludes("SİDE", "sıde"), true);
  });

  it("İNCA ailesi dört yazım varyantıyla da bulunur", () => {
    for (const q of ["İNCA", "INCA", "inca", "ınca"]) {
      assert.equal(turkishIncludes("İNCA", q), true, `query="${q}" eşleşmeliydi`);
    }
  });

  it("alt-dize aramasında ilgisiz kelimeyle eşleşmez", () => {
    assert.equal(turkishIncludes("SİDE", "wavy"), false);
  });

  it("boş sorgu her zaman eşleşir", () => {
    assert.equal(turkishIncludes("SİDE", ""), true);
    assert.equal(turkishIncludes("SİDE", "   "), true);
  });
});
