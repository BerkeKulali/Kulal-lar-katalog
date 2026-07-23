/**
 * Basit bellek-içi oran sınırlayıcı. Serverless'ta instance başına çalışır;
 * kaba kuvvet denemelerini yavaşlatmak için yeterlidir.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}

// --- Dağıtık (Upstash Redis REST) oran sınırlayıcı ---
// Serverless'te bellek-içi sayaç instance başına çalışır; birden çok instance
// arasında paylaşılmaz. Upstash env'i tanımlıysa REST üzerinden paylaşılan
// sabit-pencere sayacı kullanılır; yoksa bellek-içine düşer (fail-safe).

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.trim();
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export function isDistributedRateLimitEnabled(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

/** Başarılı işlemden sonra sayacı sıfırlar (bellek-içi + Upstash bucket). */
export async function clearRateLimitShared(
  key: string,
  windowMs: number
): Promise<void> {
  clearRateLimit(key);
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  const bucket = Math.floor(Date.now() / windowMs);
  try {
    await fetch(`${UPSTASH_URL}/del/rl:${encodeURIComponent(key)}:${bucket}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
  } catch {
    // sıfırlama kritik değil
  }
}

/**
 * Paylaşılan oran sınırı. Upstash yoksa bellek-içi checkRateLimit'e düşer.
 * Fixed-window: pencere başına anahtar; ilk artışta TTL set edilir.
 */
export async function checkRateLimitShared(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return checkRateLimit(key, { max, windowMs });
  }

  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${bucket}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      // INCR sayacı artırır; PEXPIRE NX yalnızca TTL yoksa (ilk artış) set eder.
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, windowMs, "NX"],
      ]),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const data = (await res.json()) as { result?: number }[];
    const count = Number(data?.[0]?.result ?? 0);

    if (count > max) {
      return { allowed: false, retryAfterSeconds: windowSeconds };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    // Ağ/Upstash hatasında korumasız kalmamak için bellek-içine düş.
    return checkRateLimit(key, { max, windowMs });
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
