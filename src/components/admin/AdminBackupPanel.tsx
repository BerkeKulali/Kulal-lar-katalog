"use client";

import { useEffect, useState } from "react";

type CloudBackup = {
  publicId: string;
  url: string;
  createdAt: string;
  bytes: number;
};

export function AdminBackupPanel() {
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backup?mode=history");
      const data = (await res.json()) as { backups?: CloudBackup[] };
      if (res.ok) setBackups(data.backups ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function downloadBackup() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/backup");
    if (!res.ok) {
      setError("Yedek indirilemedi.");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "kulalilar-db-backup.json";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Yedek indirildi.");
  }

  async function uploadToCloud() {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        summary?: { variants: number; families: number };
      };
      if (!res.ok) throw new Error(data.error ?? "Buluta yedeklenemedi");
      setMessage(
        `Buluta yedeklendi (${data.summary?.variants ?? 0} varyant).`
      );
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buluta yedeklenemedi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-8 border border-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Veritabani yedegi</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Canli veriyi JSON olarak indirin veya Cloudinary&apos;ye yedekleyin.
        Gunluk otomatik yedek (Vercel cron) de acilabilir.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void downloadBackup()}
          className="border border-zinc-600 px-3 py-2 text-xs font-semibold hover:border-white"
        >
          Yedek indir
        </button>
        <button
          type="button"
          onClick={() => void uploadToCloud()}
          disabled={uploading}
          className="border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-200 hover:border-amber-400 disabled:opacity-50"
        >
          {uploading ? "Yedekleniyor..." : "Buluta yedekle"}
        </button>
      </div>

      {message && <p className="mt-3 text-xs text-green-400">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4">
        <p className="text-[11px] font-medium text-zinc-400">Son bulut yedekleri</p>
        {loading ? (
          <p className="mt-2 text-xs text-zinc-600">Yukleniyor...</p>
        ) : backups.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-600">Henuz bulut yedegi yok.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {backups.map((b) => (
              <li key={b.publicId} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-zinc-500">
                  {new Intl.DateTimeFormat("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(b.createdAt))}
                  {" · "}
                  {Math.round(b.bytes / 1024)} KB
                </span>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 border border-zinc-700 px-2 py-1 hover:border-white"
                >
                  Indir
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
