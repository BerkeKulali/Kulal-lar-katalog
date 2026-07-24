import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupBalancesByVariant } from "@/lib/netsis-stock-import";

describe("groupBalancesByVariant", () => {
  it("kodları varyantlara eşler, bakiyeyi doğru yazar", () => {
    const balances = new Map([
      ["GRS1", 100],
      ["GRS2", 50],
    ]);
    const variantByCode = new Map([
      ["GRS1", "v1"],
      ["GRS2", "v2"],
    ]);
    const { byVariant, unmatchedCodes, matchedCodes } = groupBalancesByVariant(
      balances,
      variantByCode
    );
    assert.equal(byVariant.get("v1"), 100);
    assert.equal(byVariant.get("v2"), 50);
    assert.equal(matchedCodes, 2);
    assert.deepEqual(unmatchedCodes, []);
  });

  it("aynı varyanta ait birden çok kodun bakiyesini toplar", () => {
    const balances = new Map([
      ["GRS1", 100],
      ["GRS1-D", 41], // aynı varyant
    ]);
    const variantByCode = new Map([
      ["GRS1", "v1"],
      ["GRS1-D", "v1"],
    ]);
    const { byVariant } = groupBalancesByVariant(balances, variantByCode);
    assert.equal(byVariant.get("v1"), 141);
    assert.equal(byVariant.size, 1);
  });

  it("eşleşmeyen kodları ayrı raporlar", () => {
    const balances = new Map([
      ["GRS1", 100],
      ["BILINMEYEN", 5],
    ]);
    const variantByCode = new Map([["GRS1", "v1"]]);
    const { byVariant, unmatchedCodes, matchedCodes } = groupBalancesByVariant(
      balances,
      variantByCode
    );
    assert.equal(byVariant.get("v1"), 100);
    assert.deepEqual(unmatchedCodes, ["BILINMEYEN"]);
    assert.equal(matchedCodes, 1);
  });

  it("sıfır ve negatif bakiyeyi korur", () => {
    const balances = new Map([
      ["A", 0],
      ["B", -12],
    ]);
    const variantByCode = new Map([
      ["A", "v1"],
      ["B", "v2"],
    ]);
    const { byVariant } = groupBalancesByVariant(balances, variantByCode);
    assert.equal(byVariant.get("v1"), 0);
    assert.equal(byVariant.get("v2"), -12);
  });

  it("boş girdi boş sonuç", () => {
    const { byVariant, unmatchedCodes, matchedCodes } = groupBalancesByVariant(
      new Map(),
      new Map()
    );
    assert.equal(byVariant.size, 0);
    assert.deepEqual(unmatchedCodes, []);
    assert.equal(matchedCodes, 0);
  });
});
