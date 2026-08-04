"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SalespersonOption = {
  id: string;
  name: string;
  isLocked: boolean;
};

type RequestStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
type RequestKind = "salesperson" | "dealer" | null;
type EntryMode = "dealer" | "salesperson" | "admin";

export function SetupEntryPanel({
  salespeople,
  initialError,
}: {
  salespeople: SalespersonOption[];
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>("dealer");
  const [dealerName, setDealerName] = useState("");
  const [salespersonId, setSalespersonId] = useState(
    salespeople.find((sp) => !sp.isLocked)?.id ?? ""
  );
  const [status, setStatus] = useState<RequestStatus>("NONE");
  const [requestKind, setRequestKind] = useState<RequestKind>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  const selectedSalespersonName = useMemo(
    () => salespeople.find((sp) => sp.id === salespersonId)?.name ?? "",
    [salespeople, salespersonId]
  );

  async function loadRequestStatus() {
    const [spRes, dealerRes] = await Promise.all([
      fetch("/api/device/register/salesperson/status", { cache: "no-store" }),
      fetch("/api/device/register/dealer/status", { cache: "no-store" }),
    ]);
    const spData = spRes.ok ? await spRes.json().catch(() => null) : null;
    const dealerData = dealerRes.ok ? await dealerRes.json().catch(() => null) : null;

    const spStatus = (spData?.status ?? "NONE") as RequestStatus;
    const dealerStatus = (dealerData?.status ?? "NONE") as RequestStatus;

    if (spStatus !== "NONE") {
      setRequestKind("salesperson");
      setStatus(spStatus);
      setMode("salesperson");
      if (spStatus === "PENDING") {
        setStatusMessage(
          `${spData.salespersonName ?? "Plasiyer"} için admin onayı bekleniyor.`
        );
      } else if (spStatus === "APPROVED") {
        setStatusMessage("Talep onaylandı. Girişi tamamlayabilirsiniz.");
      } else if (spStatus === "REJECTED") {
        setStatusMessage(
          spData.rejectionReason
            ? `Talep reddedildi: ${spData.rejectionReason}`
            : "Talep reddedildi."
        );
      }
      return;
    }

    if (dealerStatus !== "NONE") {
      setRequestKind("dealer");
      setStatus(dealerStatus);
      setMode("dealer");
      if (dealerStatus === "PENDING") {
        setStatusMessage(
          `${dealerData.dealerName ?? "Bayi"} için admin onayı bekleniyor.`
        );
      } else if (dealerStatus === "APPROVED") {
        setStatusMessage("Talep onaylandı. Girişi tamamlayabilirsiniz.");
      } else if (dealerStatus === "REJECTED") {
        setStatusMessage(
          dealerData.rejectionReason
            ? `Talep reddedildi: ${dealerData.rejectionReason}`
            : "Talep reddedildi."
        );
      }
      return;
    }

    setRequestKind(null);
    setStatus("NONE");
  }

  useEffect(() => {
    loadRequestStatus().catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(() => {
      loadRequestStatus().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [status]);

  async function handleDealerRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const res = await fetch("/api/device/register/dealer/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Talep oluşturulamadı");
        return;
      }
      setRequestKind("dealer");
      setStatus("PENDING");
      setStatusMessage(
        `${dealerName.trim() || "Bayi"} için admin onayı bekleniyor.`
      );
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function handleDealerFinalize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/device/register/dealer/finalize", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Giriş tamamlanamadı");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function handleSalespersonRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const res = await fetch("/api/device/register/salesperson/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Talep oluşturulamadı");
        return;
      }
      setRequestKind("salesperson");
      setStatus("PENDING");
      setStatusMessage(
        `${selectedSalespersonName || "Plasiyer"} için admin onayı bekleniyor.`
      );
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function handleSalespersonFinalize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/device/register/salesperson/finalize", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Giriş tamamlanamadı");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSession() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/device/reset", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Cihaz sıfırlanamadı");
        return;
      }
      router.push("/kurulum");
      router.refresh();
    } catch {
      setError("Cihaz sıfırlanamadı");
    } finally {
      setLoading(false);
    }
  }

  const dealerPending = requestKind === "dealer" && status === "PENDING";
  const dealerApproved = requestKind === "dealer" && status === "APPROVED";

  return (
    <div className="mx-auto mt-8 max-w-md space-y-5 px-6">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("dealer")}
          className={`border px-3 py-2 text-xs font-semibold ${
            mode === "dealer" ? "border-white" : "border-zinc-700 text-zinc-400"
          }`}
        >
          Bayi Girişi
        </button>
        <button
          type="button"
          onClick={() => setMode("salesperson")}
          className={`border px-3 py-2 text-xs font-semibold ${
            mode === "salesperson"
              ? "border-white"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          Plasiyer Girişi
        </button>
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={`border px-3 py-2 text-xs font-semibold ${
            mode === "admin" ? "border-white" : "border-zinc-700 text-zinc-400"
          }`}
        >
          Admin Girişi
        </button>
      </div>

      {mode === "dealer" && (
        <form
          onSubmit={handleDealerRequest}
          className="space-y-3 border border-zinc-800 p-4"
        >
          <p className="text-xs text-zinc-400">
            Bayi girişi admin onayından sonra tamamlanır.
          </p>
          <input
            type="text"
            value={dealerName}
            onChange={(e) => setDealerName(e.target.value)}
            placeholder="Bayi adı"
            disabled={loading || dealerPending}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          {dealerApproved ? (
            <button
              type="button"
              onClick={handleDealerFinalize}
              disabled={loading}
              className="w-full border border-emerald-500 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-40"
            >
              {loading ? "Tamamlanıyor…" : "Onaylandı, girişi tamamla"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || dealerName.trim().length < 2 || dealerPending}
              className="w-full border border-white py-2 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? "Gönderiliyor…" : "Admin onayı iste"}
            </button>
          )}
        </form>
      )}

      {mode === "salesperson" && (
        <form
          onSubmit={handleSalespersonRequest}
          className="space-y-3 border border-zinc-800 p-4"
        >
          <p className="text-xs text-zinc-400">
            Plasiyer seçimi admin onayından sonra tamamlanır.
          </p>
          <select
            value={salespersonId}
            onChange={(e) => setSalespersonId(e.target.value)}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm"
            disabled={loading || status === "PENDING"}
          >
            {salespeople.map((sp) => (
              <option key={sp.id} value={sp.id} disabled={sp.isLocked}>
                {sp.name}
                {sp.isLocked ? " (başka tablette kayıtlı)" : ""}
              </option>
            ))}
          </select>

          {status === "APPROVED" ? (
            <button
              type="button"
              onClick={handleSalespersonFinalize}
              disabled={loading}
              className="w-full border border-emerald-500 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-40"
            >
              {loading ? "Tamamlanıyor…" : "Onaylandı, girişi tamamla"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                loading ||
                !salespersonId ||
                status === "PENDING" ||
                salespeople.length === 0
              }
              className="w-full border border-white py-2 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? "Gönderiliyor…" : "Admin onayı iste"}
            </button>
          )}
        </form>
      )}

      {mode === "admin" && (
        <div className="space-y-3 border border-zinc-800 p-4">
          <p className="text-xs text-zinc-400">
            Admin kullanıcı adı/şifre ile giriş yapar. İsterseniz bu cihazı hatırlatabilirsiniz.
          </p>
          <a
            href="/admin/login"
            className="block w-full border border-white py-2 text-center text-sm font-semibold"
          >
            Admin girişine git
          </a>
        </div>
      )}

      {statusMessage && (
        <p className="rounded border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {statusMessage}
        </p>
      )}
      {error && (
        <p className="rounded border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleResetSession}
        disabled={loading}
        className="w-full border border-zinc-700 py-2 text-xs text-zinc-300 disabled:opacity-40"
      >
        Test için bu cihazdaki tüm girişleri sıfırla
      </button>
    </div>
  );
}
