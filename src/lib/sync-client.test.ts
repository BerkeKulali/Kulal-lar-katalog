import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldUseDelta } from "@/lib/sync-client";
import { FULL_SYNC_MAX_AGE_MS } from "@/lib/sync-types";

const NOW = 1_800_000_000_000; // sabit referans zaman

describe("shouldUseDelta", () => {
  it("hiç yerel veri yoksa tam senkron ister", () => {
    assert.equal(
      shouldUseDelta({
        hasLocalData: false,
        lastSyncAt: new Date(NOW - 1000).toISOString(),
        lastFullSyncAt: new Date(NOW - 1000).toISOString(),
        now: NOW,
      }),
      false
    );
  });

  it("hiç tam senkron yapılmadıysa (lastFullSyncAt null) tam senkron ister", () => {
    assert.equal(
      shouldUseDelta({
        hasLocalData: true,
        lastSyncAt: new Date(NOW - 1000).toISOString(),
        lastFullSyncAt: null,
        now: NOW,
      }),
      false
    );
  });

  it("son tam senkron FULL_SYNC_MAX_AGE_MS içindeyse delta kullanır", () => {
    const lastFullSyncAt = new Date(NOW - FULL_SYNC_MAX_AGE_MS / 2).toISOString();
    assert.equal(
      shouldUseDelta({
        hasLocalData: true,
        lastSyncAt: new Date(NOW - 1000).toISOString(),
        lastFullSyncAt,
        now: NOW,
      }),
      true
    );
  });

  it("aradan sık delta senkron geçse bile son TAM senkron eskiyse tam senkrona zorlar", () => {
    // Kritik regresyon testi: lastSyncAt çok yakın zamanlı olsa bile
    // (sık delta senkronlarla sürekli tazelenmiş), lastFullSyncAt eskiyse
    // yine tam senkron tetiklenmeli — aksi halde güvenlik ağı hiç
    // çalışmaz (bu PR'dan önceki hata tam olarak buydu).
    const lastFullSyncAt = new Date(NOW - FULL_SYNC_MAX_AGE_MS - 1000).toISOString();
    const lastSyncAt = new Date(NOW - 1000).toISOString(); // az önce bir delta oldu
    assert.equal(
      shouldUseDelta({
        hasLocalData: true,
        lastSyncAt,
        lastFullSyncAt,
        now: NOW,
      }),
      false
    );
  });
});
