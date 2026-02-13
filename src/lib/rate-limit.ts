const rateMap = new Map<string, { count: number; resetAt: number }>();

type Options = {
  limit?: number;
  windowMs?: number;
};

export function rateLimit(key: string, options: Options = {}): { ok: boolean; remaining: number } {
  const { limit = 30, windowMs = 60_000 } = options;
  const now = Date.now();

  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: limit - entry.count };
}

export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: "リクエスト回数の上限に達しました。しばらくお待ちください。" }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  );
}
