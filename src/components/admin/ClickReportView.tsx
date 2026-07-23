"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actorTypeLabel,
  DIMENSION_LABELS,
  REPORT_DIMENSIONS,
  type ReportDimension,
  type ReportResult,
} from "@/lib/click-report";

type Salesperson = { id: string; name: string };

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

export function ClickReportView({
  salespeople,
  initialFamilyId,
  initialFamilyLabel,
  initialDimensions,
}: {
  salespeople: Salesperson[];
  initialFamilyId: string | null;
  initialFamilyLabel: string | null;
  initialDimensions: ReportDimension[];
}) {
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());
  const [dims, setDims] = useState<ReportDimension[]>(initialDimensions);
  const [actorType, setActorType] = useState<"" | "dealer" | "salesperson">("");
  const [salespersonId, setSalespersonId] = useState("");
  const [actorQuery, setActorQuery] = useState("");

  const [familyId, setFamilyId] = useState(initialFamilyId ?? "");
  const [familyLabel, setFamilyLabel] = useState(initialFamilyLabel ?? "");
  const [familySearch, setFamilySearch] = useState("");
  const [familyResults, setFamilyResults] = useState<
    { id: string; name: string; brandName: string }[]
  >([]);

  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("from", from);
    p.set("to", to);
    p.set("dims", dims.join(","));
    if (actorType) p.set("actorType", actorType);
    if (salespersonId) p.set("salespersonId", salespersonId);
    if (actorQuery.trim()) p.set("q", actorQuery.trim());
    if (familyId) p.set("familyId", familyId);
    return p;
  }, [from, to, dims, actorType, salespersonId, actorQuery, familyId]);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats/report?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Rapor üretilemedi");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch {
      setError("Rapor üretilemedi");
    } finally {
      setLoading(false);
    }
  }, [params]);

  // İlk açılışta otomatik çalıştır.
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDim(d: ReportDimension) {
    setDims((prev) =>
      prev.includes(d)
        ? prev.filter((x) => x !== d).length > 0
          ? prev.filter((x) => x !== d)
          : prev // en az bir boyut kalsın
        : [...prev, d]
    );
  }

  async function searchFamilies(value: string) {
    setFamilySearch(value);
    if (!value.trim()) {
      setFamilyResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/families/search?q=${encodeURIComponent(value.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setFamilyResults(data.items ?? []);
    } catch {
      setFamilyResults([]);
    }
  }

  function pickFamily(f: { id: string; name: string; brandName: string }) {
    setFamilyId(f.id);
    setFamilyLabel(`${f.name} · ${f.brandName}`);
    setFamilySearch("");
    setFamilyResults([]);
  }

  function clearFamily() {
    setFamilyId("");
    setFamilyLabel("");
  }

  const showActorType = dims.includes("actor");

  return (
    <div className="space-y-5">
      {/* Filtreler */}
      <div className="space-y-4 border border-[var(--app-border)] p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs">
            <span className="theme-muted mb-1 block">Başlangıç</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="theme-input border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="theme-muted mb-1 block">Bitiş</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="theme-input border px-2 py-1.5 text-sm"
            />
          </label>

          <div className="text-xs">
            <span className="theme-muted mb-1 block">Kırılım</span>
            <div className="flex gap-3">
              {REPORT_DIMENSIONS.map((d) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={dims.includes(d)}
                    onChange={() => toggleDim(d)}
                  />
                  {DIMENSION_LABELS[d]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs">
            <span className="theme-muted mb-1 block">Aktör türü</span>
            <select
              value={actorType}
              onChange={(e) =>
                setActorType(e.target.value as "" | "dealer" | "salesperson")
              }
              className="theme-select border px-2 py-1.5 text-sm"
            >
              <option value="">Hepsi</option>
              <option value="dealer">Bayi</option>
              <option value="salesperson">Plasiyer</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="theme-muted mb-1 block">Plasiyer</span>
            <select
              value={salespersonId}
              onChange={(e) => setSalespersonId(e.target.value)}
              className="theme-select border px-2 py-1.5 text-sm"
            >
              <option value="">Hepsi</option>
              {salespeople.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs">
            <span className="theme-muted mb-1 block">Bayi/plasiyer adı ara</span>
            <input
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
              placeholder="ör. Kule Yapı"
              className="theme-input border px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        {/* Ürün filtresi */}
        <div className="text-xs">
          <span className="theme-muted mb-1 block">Ürün</span>
          {familyId ? (
            <div className="flex items-center gap-2">
              <span className="border border-[var(--app-border)] px-2 py-1">
                {familyLabel}
              </span>
              <button
                type="button"
                onClick={clearFamily}
                className="text-red-500 hover:opacity-70"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={familySearch}
                onChange={(e) => searchFamilies(e.target.value)}
                placeholder="Ürün ara (boş = tüm ürünler)"
                className="theme-input w-full max-w-sm border px-2 py-1.5 text-sm"
              />
              {familyResults.length > 0 && (
                <div className="mt-1 max-h-40 max-w-sm overflow-y-auto border border-[var(--app-border)]">
                  {familyResults.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => pickFamily(f)}
                      className="block w-full px-2 py-1.5 text-left hover:opacity-80"
                    >
                      {f.name}{" "}
                      <span className="theme-muted">· {f.brandName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="theme-button border px-5 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "Hazırlanıyor…" : "Raporu getir"}
          </button>
          <a
            href={`/api/admin/stats/report/export?${params.toString()}`}
            className="theme-button border px-4 py-2 text-sm"
          >
            Excel indir
          </a>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="theme-muted flex items-center justify-between text-xs">
            <span>
              Toplam tıklanma:{" "}
              <strong className="text-[var(--foreground)]">
                {result.total.toLocaleString("tr-TR")}
              </strong>{" "}
              · {result.rows.length} satır
            </span>
            {result.truncated && (
              <span className="text-amber-500">
                Çok fazla kayıt — tarih aralığını daraltın
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-[var(--app-border)]">
            <table className="w-full text-left text-xs">
              <thead className="theme-muted border-b border-[var(--app-border)]">
                <tr>
                  {result.dimensions.map((d) => (
                    <th key={d} className="p-3">
                      {DIMENSION_LABELS[d]}
                    </th>
                  ))}
                  {showActorType && <th className="p-3">Tür</th>}
                  <th className="p-3 text-right">Tıklanma</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--app-border)]">
                    {result.dimensions.map((d) => (
                      <td key={d} className="p-3">
                        {d === "product"
                          ? row.product
                          : d === "date"
                            ? row.date
                            : row.actor}
                      </td>
                    ))}
                    {showActorType && (
                      <td className="theme-muted p-3">
                        {actorTypeLabel(row.actorType)}
                      </td>
                    )}
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {row.count.toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
                {result.rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={result.dimensions.length + (showActorType ? 2 : 1)}
                      className="theme-muted p-6 text-center"
                    >
                      Bu filtrelerle kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
