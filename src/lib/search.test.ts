import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { familyMatchesQuery, itemMatchesAttributes } from "@/lib/search";

describe("familyMatchesQuery", () => {
  it("aile adında geçen kelimeyle eşleşir", () => {
    assert.equal(familyMatchesQuery("WAVY GREY", [], "grey"), true);
  });

  it("kodun BAŞINDAN eşleşirse bulunur", () => {
    assert.equal(
      familyMatchesQuery("ANTIQUE", ["GR-6060-FLP"], "gr-6060"),
      true
    );
  });

  it("kodun ORTASINDA geçen ilgisiz bir kelime yanlışlıkla eşleşmez", () => {
    // GÜRAL fiyat listesi importunda 'code' alanı ham tedarikçi ürün adı
    // olabiliyor (ör. 'ANTIQUE 60X60 SİDAN PARLAK'). "sid" araması bu
    // metnin ortasındaki "sidan" kelimesiyle eşleşmemeli.
    assert.equal(
      familyMatchesQuery("ANTIQUE", ["ANTIQUE 60X60 SİDAN PARLAK"], "sid"),
      false
    );
  });

  it("aile adı da ilgisizse eşleşmez", () => {
    assert.equal(
      familyMatchesQuery("ANTIQUE", ["ANTIQUE 60X60 SİDAN PARLAK"], "wavy"),
      false
    );
  });

  it("boş sorgu her zaman eşleşir", () => {
    assert.equal(familyMatchesQuery("ANTIQUE", [], ""), true);
  });
});

describe("itemMatchesAttributes", () => {
  const item = {
    color: "gri",
    materialType: "ahsap",
    size: "60x120",
    brandSlug: "bien",
  };

  it("boş filtre her şeyi geçirir", () => {
    assert.equal(itemMatchesAttributes(item, {}), true);
  });

  it("renk uymazsa eler", () => {
    assert.equal(itemMatchesAttributes(item, { color: "siyah" }), false);
  });

  it("tip uymazsa eler", () => {
    assert.equal(itemMatchesAttributes(item, { materialType: "mermer" }), false);
  });

  it("ebat uymazsa eler", () => {
    assert.equal(itemMatchesAttributes(item, { size: "30x60" }), false);
  });

  it("marka uymazsa eler", () => {
    assert.equal(itemMatchesAttributes(item, { brandSlug: "qua" }), false);
  });

  it("tüm filtreler uyuyorsa geçer", () => {
    assert.equal(
      itemMatchesAttributes(item, {
        color: "gri",
        materialType: "ahsap",
        size: "60x120",
        brandSlug: "bien",
      }),
      true
    );
  });
});
