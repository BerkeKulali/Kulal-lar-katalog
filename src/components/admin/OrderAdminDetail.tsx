"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  ORDER_ACTION_LABELS,
  ORDER_STATUS_LABELS,
} from "@/lib/order-admin";
import type { OrderStatus } from "@/generated/prisma/client";
import { formatPrice, formatStock } from "@/lib/utils";

type OrderLine = {
  id: string;
  variantId: string;
  productLabel: string;
  quantityM2: number;
  unitPriceSnapshot: number;
  brandName: string;
  stockTotal: number;
};

type OrderLog = {
  id: string;
  adminName: string;
  action: string;
  message: string | null;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  dealerName: string;
  notes: string | null;
  correctionNote: string | null;
  status: OrderStatus;
  approvedByAdminName: string | null;
  approvedAt: string | null;
  createdAt: string;
  salesperson: { name: string } | null;
  lines: OrderLine[];
  logs: OrderLog[];
};

type VariantOption = {
  id: string;
  label: string;
  price: number | null;
  brandName: string;
};

export function OrderAdminDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [correctionNote, setCorrectionNote] = useState("");
  const [deductOnApprove, setDeductOnApprove] = useState(false);
  const [dealerName, setDealerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [addVariantId, setAddVariantId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [variantQuery, setVariantQuery] = useState("");
  const [variantSearchLoading, setVariantSearchLoading] = useState(false);

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const isLocked = order?.status === "APPROVED";

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/orders/${orderId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Sipariş yüklenemedi");
      setOrder(null);
      return;
    }
    const o = data.order as OrderDetail;
    setOrder(o);
    setDealerName(o.dealerName);
    setOrderNotes(o.notes ?? "");
    setError(null);
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    loadOrder().finally(() => setLoading(false));
  }, [loadOrder]);

  useEffect(() => {
    let cancelled = false;
    const q = variantQuery.trim();
    const timer = window.setTimeout(async () => {
      setVariantSearchLoading(true);
      const params = new URLSearchParams({ limit: "40" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/variants/search?${params}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      const items = (data.items ?? []) as VariantOption[];
      setVariants(items);
      setVariantSearchLoading(false);
    }, q ? 280 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [variantQuery]);

  const variantMap = useMemo(
    () => new Map(variants.map((v) => [v.id, v])),
    [variants]
  );

  async function runAction(
    fn: () => Promise<Response>,
    successMsg?: string
  ) {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    const res = await fn();
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);
    if (!res.ok) {
      setError(data.error ?? "İşlem başarısız");
      return;
    }
    if (successMsg) setMessage(successMsg);
    await loadOrder();
  }

  if (loading) {
    return (
      <AppShell variant="admin" className="py-8">
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell variant="admin" className="py-8">
        <p className="text-sm text-red-400">{error ?? "Sipariş bulunamadı"}</p>
        <Link href="/admin/siparisler" className="mt-4 inline-block text-xs text-zinc-500">
          ← Siparişler
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell variant="admin" className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/siparisler" className="text-xs text-zinc-500 hover:text-white">
            ← Siparişler
          </Link>
          <h1 className="mt-2 text-lg font-bold">{order.orderNumber}</h1>
          <p className="text-xs text-zinc-500">
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(order.createdAt))}
          </p>
        </div>
        <span className="border border-zinc-700 px-2 py-1 text-xs">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {message && (
        <p className="mb-4 border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 border border-zinc-800 p-4 text-sm sm:grid-cols-2">
        <div>
          <p>
            <span className="text-zinc-500">Bayi:</span> {order.dealerName}
          </p>
          {order.salesperson && (
            <p className="mt-1 text-xs text-zinc-500">
              Plasiyer: {order.salesperson.name}
            </p>
          )}
          {order.approvedByAdminName && (
            <p className="mt-1 text-xs text-emerald-600">
              Onaylayan: {order.approvedByAdminName}
              {order.approvedAt &&
                ` · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.approvedAt))}`}
            </p>
          )}
          {order.correctionNote && (
            <p className="mt-2 text-xs text-amber-600">
              Düzeltme notu: {order.correctionNote}
            </p>
          )}
        </div>
        {!isLocked && (
          <div className="space-y-2">
            <label className="block text-[11px] text-zinc-500">
              Bayi adı
              <input
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-[11px] text-zinc-500">
              Not
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() =>
                runAction(
                  () =>
                    fetch(`/api/admin/orders/${orderId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "update_meta",
                        dealerName,
                        notes: orderNotes,
                      }),
                    }),
                  "Bilgiler güncellendi"
                )
              }
              className="border border-zinc-600 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
            >
              Bilgileri kaydet
            </button>
          </div>
        )}
      </div>

      {!isLocked && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              runAction(
                () =>
                  fetch(`/api/admin/orders/${orderId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "approve",
                      deductStock: deductOnApprove,
                    }),
                  }),
                "Sipariş onaylandı"
              )
            }
            className="border border-emerald-800 px-3 py-2 text-xs font-semibold text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
          >
            Onayla
          </button>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={deductOnApprove}
              onChange={(e) => setDeductOnApprove(e.target.checked)}
            />
            Onayda stok düş
          </label>
        </div>
      )}

      {!isLocked && (
        <div className="mb-6 border border-zinc-800 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-400">Düzeltme iste</p>
          <textarea
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            placeholder="Plasiyere iletilecek not…"
            rows={2}
            className="w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={actionLoading || !correctionNote.trim()}
            onClick={() =>
              runAction(
                () =>
                  fetch(`/api/admin/orders/${orderId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "request_correction",
                      correctionNote,
                    }),
                  }),
                "Düzeltme istendi"
              )
            }
            className="mt-2 border border-amber-900 px-3 py-1.5 text-xs text-amber-400 hover:border-amber-500 disabled:opacity-50"
          >
            Düzeltme iste
          </button>
        </div>
      )}

      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-semibold">Sipariş satırları</h2>
        {order.lines.map((line) => (
          <div key={line.id} className="border border-zinc-800 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{line.productLabel}</p>
                <p className="text-[11px] text-zinc-600">
                  {line.brandName} · Stok: {formatStock(line.stockTotal)}
                </p>
              </div>
              {editingLineId === line.id ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] text-zinc-500">
                    m²
                    <input
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="ml-1 w-20 border border-zinc-700 bg-black px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-[11px] text-zinc-500">
                    Fiyat
                    <input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="ml-1 w-20 border border-zinc-700 bg-black px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(
                        () =>
                          fetch(
                            `/api/admin/orders/${orderId}/lines/${line.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                quantityM2: Number(editQty),
                                unitPriceSnapshot: Number(editPrice),
                              }),
                            }
                      ),
                        "Satır güncellendi"
                      ).then(() => setEditingLineId(null))
                    }
                    className="border border-zinc-600 px-2 py-1 text-xs"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLineId(null)}
                    className="text-xs text-zinc-500"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <div className="text-right text-xs">
                  <p>
                    {formatStock(line.quantityM2)} ·{" "}
                    {formatPrice(line.unitPriceSnapshot)}
                  </p>
                  {!isLocked && (
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLineId(line.id);
                          setEditQty(String(line.quantityM2));
                          setEditPrice(String(line.unitPriceSnapshot));
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          runAction(
                            () =>
                              fetch(
                                `/api/admin/orders/${orderId}/lines/${line.id}/stock`,
                                { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
                              ),
                            "Stok düşüldü"
                          )
                        }
                        className="text-zinc-400 hover:text-white"
                      >
                        Stok düş
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          if (!window.confirm("Satır silinsin mi?")) return;
                          runAction(
                            () =>
                              fetch(
                                `/api/admin/orders/${orderId}/lines/${line.id}`,
                                { method: "DELETE" }
                              ),
                            "Satır silindi"
                          );
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="mb-6 border border-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-semibold">Ürün ekle</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] text-zinc-500 sm:col-span-2">
              Ürün ara
              <input
                type="search"
                value={variantQuery}
                onChange={(e) => setVariantQuery(e.target.value)}
                placeholder="Aile adı veya ürün kodu"
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-[11px] text-zinc-500 sm:col-span-2">
              Ürün
              <select
                value={addVariantId}
                onChange={(e) => {
                  setAddVariantId(e.target.value);
                  const v = variantMap.get(e.target.value);
                  if (v?.price) setAddPrice(String(v.price));
                }}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              >
                {variantSearchLoading && (
                  <option value="">Aranıyor...</option>
                )}
                {!variantSearchLoading && variants.length === 0 && (
                  <option value="">Sonuç yok — arama yapın</option>
                )}
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brandName} · {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-zinc-500">
              Miktar (m²)
              <input
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-[11px] text-zinc-500">
              Fiyat (+KDV)
              <input
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                className="mt-1 w-full border border-zinc-700 bg-black px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={actionLoading || !addVariantId || !addQty}
            onClick={() =>
              runAction(
                () =>
                  fetch(`/api/admin/orders/${orderId}/lines`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      variantId: addVariantId,
                      quantityM2: Number(addQty),
                      unitPriceSnapshot: Number(addPrice),
                    }),
                  }),
                "Ürün eklendi"
              )
            }
            className="mt-3 border border-zinc-600 px-3 py-1.5 text-xs hover:border-white disabled:opacity-50"
          >
            Satıra ekle
          </button>
        </div>
      )}

      <div className="mb-8 border border-zinc-800 p-4">
        <h2 className="mb-3 text-sm font-semibold">İşlem geçmişi</h2>
        {order.logs.length === 0 ? (
          <p className="text-xs text-zinc-600">Henüz kayıt yok.</p>
        ) : (
          <ul className="space-y-2">
            {order.logs.map((log) => (
              <li key={log.id} className="border-b border-zinc-900 pb-2 text-xs last:border-0">
                <p className="font-medium">
                  {ORDER_ACTION_LABELS[log.action] ?? log.action}
                  <span className="ml-2 font-normal text-zinc-500">
                    — {log.adminName}
                  </span>
                </p>
                {log.message && (
                  <p className="mt-0.5 text-zinc-500">{log.message}</p>
                )}
                <p className="mt-0.5 text-[10px] text-zinc-600">
                  {new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(log.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLocked && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-900 pt-6">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => {
              if (!window.confirm("Sipariş reddedilsin mi?")) return;
              runAction(
                () =>
                  fetch(`/api/admin/orders/${orderId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reject" }),
                  }),
                "Sipariş reddedildi"
              );
            }}
            className="border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
          >
            Reddet
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={async () => {
              if (!window.confirm("Sipariş kalıcı olarak silinsin mi?")) return;
              setActionLoading(true);
              const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "DELETE",
              });
              setActionLoading(false);
              if (res.ok) {
                window.location.href = "/admin/siparisler";
              } else {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? "Silinemedi");
              }
            }}
            className="border border-red-900 px-3 py-1.5 text-xs text-red-400"
          >
            Siparişi sil
          </button>
        </div>
      )}
    </AppShell>
  );
}
