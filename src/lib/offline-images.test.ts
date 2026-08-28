import assert from "node:assert/strict";
import { after, afterEach, describe, it } from "node:test";
import { isLikelyPhone } from "@/lib/offline-images";

// Bu test dosyası bir tarayıcı DOM'u olmadan (Node'un native --test'i,
// jsdom yok) çalışıyor - bu yüzden `window` global'ini geçici olarak
// kendimiz stub'luyoruz. `isLikelyPhone`, WiFi tespiti güvenilmez olsa
// bile telefonlarda toplu görsel indirmenin ASLA otomatik tetiklenmemesi
// için kullanılıyor (bkz. sync-client.ts) - bu yüzden eşik davranışının
// doğruluğu önemli.

const originalWindow = (globalThis as { window?: unknown }).window;

function stubWindow(innerWidth: number, innerHeight: number) {
  (globalThis as { window?: unknown }).window = { innerWidth, innerHeight };
}

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

after(() => {
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe("isLikelyPhone", () => {
  it("window hiç yoksa (SSR) false döner", () => {
    delete (globalThis as { window?: unknown }).window;
    assert.equal(isLikelyPhone(), false);
  });

  it("telefon boyutundaki dikey ekranda (375x812) true döner", () => {
    stubWindow(375, 812);
    assert.equal(isLikelyPhone(), true);
  });

  it("telefon yatay döndüğünde (812x375) de true döner (kısa kenar esas)", () => {
    stubWindow(812, 375);
    assert.equal(isLikelyPhone(), true);
  });

  it("tablet boyutundaki ekranda (768x1024) false döner", () => {
    stubWindow(768, 1024);
    assert.equal(isLikelyPhone(), false);
  });

  it("masaüstü boyutundaki ekranda (1440x900) false döner", () => {
    stubWindow(1440, 900);
    assert.equal(isLikelyPhone(), false);
  });
});
