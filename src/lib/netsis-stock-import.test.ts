import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseNetsisBalanceRows,
  parseNetsisCodesInput,
  parseStockQuantity,
} from "@/lib/netsis-stock-import";

describe("parseNetsisCodesInput", () => {
  it("virgül / boşluk / satır sonuyla ayrılmış kodları böler", () => {
    assert.deepEqual(parseNetsisCodesInput("GRS1, GRS2"), ["GRS1", "GRS2"]);
    assert.deepEqual(parseNetsisCodesInput("GRS1 GRS2"), ["GRS1", "GRS2"]);
    assert.deepEqual(parseNetsisCodesInput("GRS1;GRS2\nGRS3"), [
      "GRS1",
      "GRS2",
      "GRS3",
    ]);
  });

  it("büyük harfe çevirir ve boşlukları temizler", () => {
    assert.deepEqual(parseNetsisCodesInput("  grs1 , grs1-d "), [
      "GRS1",
      "GRS1-D",
    ]);
  });

  it("tekrarları temizler, sırayı korur", () => {
    assert.deepEqual(parseNetsisCodesInput("A, B, A, c, B"), ["A", "B", "C"]);
  });

  it("boş girdide boş dizi döner", () => {
    assert.deepEqual(parseNetsisCodesInput(""), []);
    assert.deepEqual(parseNetsisCodesInput("   ,  ; "), []);
  });
});

describe("parseStockQuantity", () => {
  it("düz sayıları okur", () => {
    assert.equal(parseStockQuantity(802), 802);
    assert.equal(parseStockQuantity("243"), 243);
    assert.equal(parseStockQuantity("0"), 0);
  });

  it("nokta binlik ayıracıdır (Netsis Türkçe biçimi)", () => {
    assert.equal(parseStockQuantity("1.241"), 1241);
    assert.equal(parseStockQuantity("2.834"), 2834);
    assert.equal(parseStockQuantity("12.345"), 12345);
    assert.equal(parseStockQuantity("1.234.567"), 1234567);
  });

  it("noktadan sonra 3 hane yoksa ondalık kabul eder", () => {
    assert.equal(parseStockQuantity("1.5"), 1.5);
    assert.equal(parseStockQuantity("1.02"), 1.02);
  });

  it("TR biçimi 2.656,80 = 2656.8", () => {
    assert.equal(parseStockQuantity("2.656,80"), 2656.8);
  });

  it("virgül ondalık: 1,5 = 1.5", () => {
    assert.equal(parseStockQuantity("1,5"), 1.5);
  });

  it("boş değer için null", () => {
    assert.equal(parseStockQuantity(""), null);
    assert.equal(parseStockQuantity(null), null);
  });

  it("negatif stoku kabul eder (fazla satış)", () => {
    assert.equal(parseStockQuantity("-5"), -5);
    assert.equal(parseStockQuantity(-12), -12);
    assert.equal(parseStockQuantity("-1.241"), -1241);
  });
});

describe("parseNetsisBalanceRows", () => {
  it("Stok Kodu + Bakiye sütunlarını eşler", () => {
    const { balances, errors } = parseNetsisBalanceRows([
      { "Stok Kodu": "GRS0000002", "Stok İsmi": "MISHA", Bakiye: "802" },
      { "Stok Kodu": "GRL91707369", Bakiye: "243" },
    ]);
    assert.equal(errors.length, 0);
    assert.equal(balances.get("GRS0000002"), 802);
    assert.equal(balances.get("GRL91707369"), 243);
  });

  it("bakiye 0 satırlarını korur (stok sıfırlanabilsin)", () => {
    const { balances } = parseNetsisBalanceRows([
      { "Stok Kodu": "BIP156XDBAB8-3D", Bakiye: "0" },
    ]);
    assert.equal(balances.get("BIP156XDBAB8-3D"), 0);
    assert.ok(balances.has("BIP156XDBAB8-3D"));
  });

  it("kodu büyük harfe normalize eder", () => {
    const { balances } = parseNetsisBalanceRows([
      { "stok kodu": "grs000000221", bakiye: "1.452" },
    ]);
    assert.equal(balances.get("GRS000000221"), 1452);
  });

  it("aynı kodun bakiyelerini toplar", () => {
    const { balances } = parseNetsisBalanceRows([
      { "Stok Kodu": "X1", Bakiye: "10" },
      { "Stok Kodu": "X1", Bakiye: "5" },
    ]);
    assert.equal(balances.get("X1"), 15);
  });

  it("boş bakiyeyi 0 kabul eder", () => {
    const { balances } = parseNetsisBalanceRows([
      { "Stok Kodu": "X1", Bakiye: "" },
    ]);
    assert.equal(balances.get("X1"), 0);
  });

  it("kodsuz ama bakiyeli satırı hata sayar", () => {
    const { balances, errors } = parseNetsisBalanceRows([
      { "Stok Kodu": "", Bakiye: "50" },
    ]);
    assert.equal(balances.size, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Stok kodu boş/);
  });

  it("tamamen boş satırı sessizce atlar", () => {
    const { balances, errors } = parseNetsisBalanceRows([
      { "Stok Kodu": "", Bakiye: "" },
    ]);
    assert.equal(balances.size, 0);
    assert.equal(errors.length, 0);
  });

  it("geçersiz bakiyeyi hata sayar", () => {
    const { errors } = parseNetsisBalanceRows([
      { "Stok Kodu": "X1", Bakiye: "abc" },
    ]);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /Geçersiz bakiye/);
  });
});
