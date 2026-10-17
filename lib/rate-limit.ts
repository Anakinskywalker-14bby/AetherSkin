import "server-only";

/**
 * Sliding-window rate limiter.
 *
 * Production path: Upstash Redis (distributed, survives serverless
 * cold starts and multiple concurrent instances on Vercel).
 * Fallback path: per-instance in-memory window — keeps local dev and
 * preview deployments working without Redis, with an explicit warning.
 */

type LimitResult = { success: boolean; remaining: number; reset: number };

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 8; // per identifier per window

// ── Upstash-backed limiter (lazy singleton) ────────────────────────────────
let upstashLimiter: {
  limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
} | null = null;
let upstashInitAttempted = false;

async function getUpstashLimiter() {
  if (upstashInitAttempted) return upstashLimiter;
  upstashInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL not set — using per-instance in-memory limiter. " +
        "Configure Upstash for distributed limiting in production."
    );
    return null;
  }

  const [{ Ratelimit }, { Redis }] = await Promise.all([
    import("@upstash/ratelimit"),
    import("@upstash/redis"),
  ]);

  upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
    prefix: "aetherskin:rl",
    analytics: false,
  });
  return upstashLimiter;
}

// ── In-memory sliding window fallback ──────────────────────────────────────
const memoryBuckets = new Map<string, number[]>();

function memoryLimit(identifier: string): LimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;

  const hits = (memoryBuckets.get(identifier) ?? []).filter((t) => t > windowStart);
  const success = hits.length < MAX_REQUESTS;
  if (success) hits.push(now);
  memoryBuckets.set(identifier, hits);

  // Opportunistic GC to bound memory
  if (memoryBuckets.size > 10_000) {
    for (const [key, times] of memoryBuckets) {
      if (times.every((t) => t <= windowStart)) memoryBuckets.delete(key);
    }
  }

  return {
    success,
    remaining: Math.max(0, MAX_REQUESTS - hits.length),
    reset: now + WINDOW_SECONDS * 1000,
  };
}

/**
 * Rate-limit an identifier (usually `route:ip`).
 * Fails OPEN on limiter infrastructure errors so a Redis outage
 * never takes the site down — but logs loudly.
 */
export async function rateLimit(identifier: string): Promise<LimitResult> {
  try {
    const limiter = await getUpstashLimiter();
    if (limiter) {
      const { success, remaining, reset } = await limiter.limit(identifier);
      return { success, remaining, reset };
    }
  } catch (err) {
    console.error("[rate-limit] limiter error — failing open:", err);
    return { success: true, remaining: 1, reset: Date.now() + WINDOW_SECONDS * 1000 };
  }
  return memoryLimit(identifier);
}

/** Extract the best-effort client IP behind Vercel's proxy. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
