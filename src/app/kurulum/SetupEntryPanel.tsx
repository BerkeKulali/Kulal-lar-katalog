"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SalespersonOption = {
  id: string;
  name: string;
  isLocked: boolean;
};

type RequestStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
type EntryMode = "dealer" | "salesperson" | "admin";
type DealerAuthMode = "login" | "signup";
type SalespersonAuthMode = "request" | "login";

export function SetupEntryPanel({
  salespeople,
  initialError,
}: {
  salespeople: SalespersonOption[];
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>("dealer");
  const [salespersonId, setSalespersonId] = useState(
    salespeople.find((sp) => !sp.isLocked)?.id ?? ""
  );
  const [status, setStatus] = useState<RequestStatus>("NONE");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  const [dealerAuthMode, setDealerAuthMode] = useState<DealerAuthMode>("login");
  const [dealerUsername, setDealerUsername] = useState("");
  const [dealerPassword, setDealerPassword] = useState("");
  const [dealerSignupName, setDealerSignupName] = useState("");
  const [dealerSignupUsername, setDealerSignupUsername] = useState("");
  const [dealerSignupPassword, setDealerSignupPassword] = useState("");
  const [dealerMessage, setDealerMessage] = useState("");
  const [dealerError, setDealerError] = useState("");

  const [salespersonAuthMode, setSalespersonAuthMode] =
    useState<SalespersonAuthMode>("request");
  const [salespersonUsername, setSalespersonUsername] = useState("");
  const [salespersonPassword, setSalespersonPassword] = useState("");

  const selectedSalespersonName = useMemo(
    () => salespeople.find((sp) => sp.id === salespersonId)?.name ?? "",
    [salespeople, salespersonId]
  );

  async function loadRequestStatus() {
    const res = await fetch("/api/device/register/salesperson/status", { cache: "no-store" });
    const data = res.ok ? await res.json().catch(() => null) : null;
    const spStatus = (data?.status ?? "NONE") as RequestStatus;

    setStatus(spStatus);
    if (spStatus === "PENDING") {
      setStatusMessage(`${data.salespersonName ?? "Plasiyer"} için admin onayı bekleniyor.`);
    } else if (spStatus === "APPROVED") {
      setStatusMessage("Talep onaylandı. Girişi tamamlayabilirsiniz.");
    } else if (spStatus === "REJECTED") {
      setStatusMessage(
        data.rejectionReason ? `Talep reddedildi: ${data.rejectionReason}` : "Talep reddedildi."
      );
    } else {
      setStatusMessage("");
    }
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

  async function handleDealerLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDealerError("");
    setDealerMessage("");
    try {
      const res = await fetch("/api/dealer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: dealerUsername, password: dealerPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDealerError(data.error ?? "Giriş yapılamadı");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setDealerError("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }

  async function handleDealerSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDealerError("");
    setDealerMessage("");
    try {
      const res = await fetch("/api/dealer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dealerSignupName,
          username: dealerSignupUsername,
          password: dealerSignupPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDealerError(data.error ?? "Kayıt oluşturulamadı");
        return;
      }
      setDealerMessage(
        "Kaydınız alındı. Admin onayladıktan sonra bu kullanıcı adı ve şifreyle buradan giriş yapabilirsiniz."
      );
      setDealerUsername(dealerSignupUsername);
      setDealerPassword("");
      setDealerSignupName("");
      setDealerSignupUsername("");
      setDealerSignupPassword("");
      setDealerAuthMode("login");
    } catch {
      setDealerError("Sunucuya bağlanılamadı");
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

  async function handleSalespersonLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/salesperson/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: salespersonUsername, password: salespersonPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Giriş yapılamadı");
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

  return (
    <div className="mx-auto mt-8 max-w-md space-y-5 px-6">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode("dealer")}
          aria-pressed={mode === "dealer"}
          className={`border px-3 py-2 text-xs font-semibold ${
            mode === "dealer" ? "border-white" : "border-zinc-700 text-zinc-400"
          }`}
        >
          Bayi Girişi
        </button>
        <button
          type="button"
          onClick={() => setMode("salesperson")}
          aria-pressed={mode === "salesperson"}
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
          aria-pressed={mode === "admin"}
          className={`border px-3 py-2 text-xs font-semibold ${
            mode === "admin" ? "border-white" : "border-zinc-700 text-zinc-400"
          }`}
        >
          Admin Girişi
        </button>
      </div>

      {mode === "dealer" && dealerAuthMode === "login" && (
        <form
          onSubmit={handleDealerLogin}
          className="space-y-3 border border-zinc-800 p-4"
        >
          <p className="text-xs text-zinc-400">
            Onaylı bayi kullanıcı adı ve şifrenizle herhangi bir cihazdan giriş yapabilirsiniz.
          </p>
          <input
            type="text"
            value={dealerUsername}
            onChange={(e) => setDealerUsername(e.target.value)}
            placeholder="Kullanıcı adı"
            autoCapitalize="none"
            autoComplete="username"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <input
            type="password"
            value={dealerPassword}
            onChange={(e) => setDealerPassword(e.target.value)}
            placeholder="Şifre"
            autoComplete="current-password"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !dealerUsername.trim() || !dealerPassword}
            className="w-full border border-white py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDealerAuthMode("signup");
              setDealerError("");
              setDealerMessage("");
            }}
            className="w-full text-center text-xs text-zinc-400 underline underline-offset-2"
          >
            Hesabınız yok mu? Kayıt olun
          </button>
        </form>
      )}

      {mode === "dealer" && dealerAuthMode === "signup" && (
        <form
          onSubmit={handleDealerSignup}
          className="space-y-3 border border-zinc-800 p-4"
        >
          <p className="text-xs text-zinc-400">
            Kayıt admin onayına tabidir. Onaylandıktan sonra seçtiğiniz kullanıcı adı
            ve şifreyle buradan (herhangi bir cihazdan) giriş yapabilirsiniz.
          </p>
          <input
            type="text"
            value={dealerSignupName}
            onChange={(e) => setDealerSignupName(e.target.value)}
            placeholder="Bayi adı"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <input
            type="text"
            value={dealerSignupUsername}
            onChange={(e) => setDealerSignupUsername(e.target.value)}
            placeholder="Kullanıcı adı"
            autoCapitalize="none"
            autoComplete="username"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <input
            type="password"
            value={dealerSignupPassword}
            onChange={(e) => setDealerSignupPassword(e.target.value)}
            placeholder="Şifre (en az 6 karakter)"
            autoComplete="new-password"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={
              loading ||
              dealerSignupName.trim().length < 2 ||
              dealerSignupUsername.trim().length < 3 ||
              dealerSignupPassword.length < 6
            }
            className="w-full border border-white py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "Gönderiliyor…" : "Kayıt ol / Admin onayı iste"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDealerAuthMode("login");
              setDealerError("");
              setDealerMessage("");
            }}
            className="w-full text-center text-xs text-zinc-400 underline underline-offset-2"
          >
            Zaten hesabınız var mı? Giriş yapın
          </button>
        </form>
      )}

      {mode === "dealer" && dealerMessage && (
        <p className="rounded border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {dealerMessage}
        </p>
      )}
      {mode === "dealer" && dealerError && (
        <p className="rounded border border-red-900 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {dealerError}
        </p>
      )}

      {mode === "salesperson" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setSalespersonAuthMode("request");
              setError("");
            }}
            aria-pressed={salespersonAuthMode === "request"}
            className={`border px-3 py-2 text-xs font-semibold ${
              salespersonAuthMode === "request"
                ? "border-white"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            İsimle giriş talebi
          </button>
          <button
            type="button"
            onClick={() => {
              setSalespersonAuthMode("login");
              setError("");
            }}
            aria-pressed={salespersonAuthMode === "login"}
            className={`border px-3 py-2 text-xs font-semibold ${
              salespersonAuthMode === "login"
                ? "border-white"
                : "border-zinc-700 text-zinc-400"
            }`}
          >
            Kullanıcı adı ile giriş
          </button>
        </div>
      )}

      {mode === "salesperson" && salespersonAuthMode === "request" && (
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

      {mode === "salesperson" && salespersonAuthMode === "login" && (
        <form
          onSubmit={handleSalespersonLogin}
          className="space-y-3 border border-zinc-800 p-4"
        >
          <p className="text-xs text-zinc-400">
            Admin tarafından size verilen kullanıcı adı ve şifreyle herhangi bir
            cihazdan (tablet, telefon, ...) giriş yapabilirsiniz.
          </p>
          <input
            type="text"
            value={salespersonUsername}
            onChange={(e) => setSalespersonUsername(e.target.value)}
            placeholder="Kullanıcı adı"
            autoCapitalize="none"
            autoComplete="username"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <input
            type="password"
            value={salespersonPassword}
            onChange={(e) => setSalespersonPassword(e.target.value)}
            placeholder="Şifre"
            autoComplete="current-password"
            disabled={loading}
            className="w-full border border-zinc-700 bg-black px-3 py-2 text-sm disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !salespersonUsername.trim() || !salespersonPassword}
            className="w-full border border-white py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
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

      {mode === "salesperson" && salespersonAuthMode === "request" && statusMessage && (
        <p className="rounded border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {statusMessage}
        </p>
      )}
      {mode === "salesperson" && error && (
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
