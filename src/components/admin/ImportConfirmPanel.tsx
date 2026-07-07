"use client";

import type { ReactNode } from "react";

export function ImportConfirmPanel({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  disabled,
}: {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4 rounded border border-amber-800 bg-amber-950/20 p-4">
      <p className="text-sm font-semibold text-amber-200">{title}</p>
      <div className="space-y-2 text-xs text-zinc-300">{children}</div>
      <p className="text-[11px] text-zinc-500">
        Onayladığınızda önce veritabanı yedeği Cloudinary&apos;ye alınır, ardından
        işlem başlar.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading || disabled}
          className="border border-amber-500 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-900/40 disabled:opacity-40"
        >
          {loading ? "Yedek alınıyor…" : (confirmLabel ?? "Yedek al ve uygula")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-xs text-zinc-500 hover:text-white disabled:opacity-40"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
