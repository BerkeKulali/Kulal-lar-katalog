export async function readApiJson<T = Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; raw: string }> {
  const raw = await res.text();
  if (!raw.trim()) return { data: null, raw };
  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch {
    return { data: null, raw };
  }
}

export function apiErrorMessage(
  res: Response,
  data: Record<string, unknown> | null,
  raw: string
) {
  if (data?.error && typeof data.error === "string") return data.error;
  if (res.status === 401) return "Oturum süresi dolmuş — admin olarak tekrar giriş yapın.";
  if (res.status === 413) return "Dosya çok büyük.";
  if (raw.trim().startsWith("<")) {
    return `Sunucu hatası (${res.status}). Dev sunucu loglarına bakın.`;
  }
  return `İstek başarısız (${res.status})`;
}
