"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SiteHeader } from "@/components/SiteHeader";
import { useCartStore } from "@/store/cart";
import { useDeviceStore } from "@/store/device";
import { formatMoneyTotal, formatPrice, qualityLabel } from "@/lib/utils";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const dealerName = useCartStore((s) => s.dealerName);
  const notes = useCartStore((s) => s.notes);
  const setDealerName = useCartStore((s) => s.setDealerName);
  const setNotes = useCartStore((s) => s.setNotes);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clear = useCartStore((s) => s.clear);
  const salespersonId = useDeviceStore((s) => s.salespersonId);
  const salespersonName = useDeviceStore((s) => s.salespersonName);
  const deviceToken = useDeviceStore((s) => s.deviceToken);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grandTotal = useMemo(
    () =>
      items.reduce((sum, item) => sum + item.price * item.quantityM2, 0),
    [items]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dealerName.trim()) {
      setError("Bayi adı gerekli");
      return;
    }
    if (items.length === 0) {
      setError("Sepet boş");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealerName: dealerName.trim(),
          notes: notes.trim() || undefined,
          salespersonId,
          deviceToken,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantityM2: item.quantityM2,
            unitPriceSnapshot: item.price,
            productLabel: `${item.familyName} ${item.size.toUpperCase()} ${item.surface} ${qualityLabel(item.quality as "FIRST" | "END")}`,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gönderilemedi");

      setSuccess(data.orderNumber);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell className="pb-28">
      <SiteHeader />
      <div className="px-5 pt-4">
        <Link href="/" className="text-xs text-zinc-500 hover:text-white">
          ← Anasayfa
        </Link>
        <h1 className="mt-4 text-lg font-bold tracking-wide">Sipariş Listesi</h1>
        {salespersonName && (
          <p className="mt-1 text-xs text-zinc-500">
            Plasiyer: {salespersonName}
          </p>
        )}
      </div>

      {success && (
        <div className="mx-5 mt-6 border border-green-700 px-4 py-3 text-sm text-green-400">
          Sipariş gönderildi: {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 px-5">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz ürün eklenmedi.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const lineTotal = item.price * item.quantityM2;
              return (
              <li
                key={item.variantId}
                className="border border-zinc-800 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.familyName}</p>
                    <p className="text-xs text-zinc-400">
                      {item.brandName} · {item.size.toUpperCase()} ·{" "}
                      {item.surface} ·{" "}
                      {qualityLabel(item.quality as "FIRST" | "END")}
                    </p>
                    <p className="mt-1">{formatPrice(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    Kaldır
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500">m²</label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={item.quantityM2}
                      onChange={(e) =>
                        updateQuantity(item.variantId, Number(e.target.value))
                      }
                      className="w-24 border border-zinc-700 bg-black px-2 py-1 text-center"
                    />
                  </div>
                  <p className="text-sm font-semibold">
                    {formatMoneyTotal(lineTotal)}
                  </p>
                </div>
              </li>
            );
            })}
          </ul>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between border border-zinc-700 px-4 py-3">
            <span className="text-sm font-semibold tracking-wide">
              Toplam
            </span>
            <span className="text-base font-bold">
              {formatMoneyTotal(grandTotal)}
            </span>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs text-zinc-500">Bayi adı *</label>
          <input
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
            className="w-full border border-zinc-700 bg-black px-4 py-3"
            placeholder="Bayi / müşteri adı"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-zinc-500">Not</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-zinc-700 bg-black px-4 py-3"
            placeholder="Ek notlar..."
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full border border-white py-3 font-semibold hover:bg-white hover:text-black disabled:opacity-40"
        >
          {loading ? "Gönderiliyor..." : "Siparişi gönder"}
        </button>
      </form>
    </AppShell>
  );
}
