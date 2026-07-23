"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/**
 * Root layout'un kendisi çökerse devreye girer. Bu noktada ThemeProvider ve
 * globals.css yüklenmemiş olabileceği için stiller satır içi verilir ve
 * kendi <html>/<body> etiketleri döndürülür.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "22rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
            Uygulama başlatılamadı
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#a1a1aa" }}>
            Beklenmeyen bir hata oluştu. Tabletinizi yenileyin; sorun sürerse
            yöneticinize bildirin.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.625rem",
                color: "#71717a",
                fontFamily: "monospace",
              }}
            >
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              color: "#fff",
              background: "transparent",
              border: "1px solid #52525b",
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
