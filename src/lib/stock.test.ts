import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStockSummary, EMPTY_STOCK_SUMMARY, hasStock } from "@/lib/stock";

describe("buildStockSummary", () => {
  it("kaliteye göre toplar", () => {
    const summary = buildStockSummary([
      { quality: "FIRST", stockM2: 10 },
      { quality: "FIRST", stockM2: 5 },
      { quality: "END", stockM2: 3 },
    ]);
    assert.equal(summary.first, 15);
    assert.equal(summary.end, 3);
  });

  it("varyant yoksa first/end null döner", () => {
    const summary = buildStockSummary([]);
    assert.equal(summary.first, null);
    assert.equal(summary.end, null);
    assert.equal(summary.updatedAt, null);
  });

  it("stockUpdatedAt verilmezse updatedAt null kalır", () => {
    const summary = buildStockSummary([{ quality: "FIRST", stockM2: 5 }]);
    assert.equal(summary.updatedAt, null);
  });

  it("en yeni stockUpdatedAt'i seçer (sıra önemli değil)", () => {
    const summary = buildStockSummary([
      { quality: "FIRST", stockM2: 1, stockUpdatedAt: "2026-08-10T09:00:00.000Z" },
      { quality: "END", stockM2: 2, stockUpdatedAt: "2026-08-15T09:49:00.000Z" },
      { quality: "FIRST", stockM2: 3, stockUpdatedAt: "2026-08-12T09:00:00.000Z" },
    ]);
    assert.equal(summary.updatedAt, "2026-08-15T09:49:00.000Z");
  });

  it("bazı satırlarda stockUpdatedAt yoksa yine de var olanların en yenisini kullanır", () => {
    const summary = buildStockSummary([
      { quality: "FIRST", stockM2: 1, stockUpdatedAt: null },
      { quality: "END", stockM2: 2, stockUpdatedAt: "2026-08-15T09:49:00.000Z" },
    ]);
    assert.equal(summary.updatedAt, "2026-08-15T09:49:00.000Z");
  });

  it("EMPTY_STOCK_SUMMARY tüm alanlarda null", () => {
    assert.deepEqual(EMPTY_STOCK_SUMMARY, {
      first: null,
      end: null,
      updatedAt: null,
    });
  });
});

describe("hasStock", () => {
  it("1. kalitede pozitif stok varsa true döner", () => {
    assert.equal(hasStock({ first: 12, end: null }), true);
  });

  it("END kalitesinde pozitif stok varsa true döner", () => {
    assert.equal(hasStock({ first: null, end: 4 }), true);
  });

  it("tüm alanlar null ise false döner", () => {
    assert.equal(hasStock({ first: null, end: null }), false);
  });

  it("tüm alanlar 0 ise false döner", () => {
    assert.equal(hasStock({ first: 0, end: 0 }), false);
  });

  it("biri 0 diğeri pozitifse true döner", () => {
    assert.equal(hasStock({ first: 0, end: 7 }), true);
  });
});
