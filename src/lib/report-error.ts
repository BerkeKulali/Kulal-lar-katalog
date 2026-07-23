/**
 * Merkezî hata raporlama soyutlaması.
 *
 * Varsayılan: yapılandırılmış console.error (Vercel loglarında toplanır).
 * Sentry (veya başka bir servis) kurulunca `setErrorSink` ile bağlanır; tüm
 * `reportError` çağrıları oraya da iletilir. Bu dosya HİÇBİR dış pakete bağlı
 * değildir — böylece Sentry kurulmadan da build/çalışma bozulmaz.
 *
 * Sentry kurulumundan sonra (bkz. README "Hata takibi"), istemci ve sunucu
 * kurulum dosyalarında şunu çağırın:
 *   import * as Sentry from "@sentry/nextjs";
 *   setErrorSink((error, context) =>
 *     Sentry.captureException(error, { extra: context }));
 */

export type ErrorContext = Record<string, unknown>;
type ErrorSink = (error: unknown, context?: ErrorContext) => void;

let sink: ErrorSink | null = null;

/** Harici hata servisini (ör. Sentry) bağlar; null ile kaldırır. */
export function setErrorSink(fn: ErrorSink | null): void {
  sink = fn;
}

/** Bir hatayı raporlar: her zaman loglar, sink varsa oraya da iletir. */
export function reportError(error: unknown, context?: ErrorContext): void {
  try {
    console.error("[error]", context ? JSON.stringify(context) : "", error);
  } catch {
    // loglama başarısız olsa bile akışı bozma
  }
  if (sink) {
    try {
      sink(error, context);
    } catch {
      // sink hatası uygulamayı etkilemesin
    }
  }
}
