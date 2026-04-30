import { createHmac, timingSafeEqual } from "crypto";

const ALLOWED_DRIFT_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 20;

type SyncAuthCache = {
  nonces: Map<string, number>;
  rate: Map<string, number[]>;
};

function getCache(): SyncAuthCache {
  const globalRef = globalThis as typeof globalThis & { __syncAuthCache?: SyncAuthCache };
  if (!globalRef.__syncAuthCache) {
    globalRef.__syncAuthCache = { nonces: new Map(), rate: new Map() };
  }
  return globalRef.__syncAuthCache;
}

function prune(cache: SyncAuthCache, now: number) {
  for (const [nonce, expiresAt] of cache.nonces) {
    if (expiresAt <= now) cache.nonces.delete(nonce);
  }
  for (const [key, timestamps] of cache.rate) {
    const fresh = timestamps.filter((stamp) => now - stamp < 60_000);
    if (fresh.length === 0) {
      cache.rate.delete(key);
      continue;
    }
    cache.rate.set(key, fresh);
  }
}

function expectedSignature(secret: string, timestamp: string, nonce: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${nonce}`).digest("hex");
}

export function verifySignedSyncRequest(input: {
  secret: string | undefined;
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
  source: string;
}) {
  const { secret, timestamp, nonce, signature, source } = input;
  if (!secret || !timestamp || !nonce || !signature) return { ok: false as const, status: 401 };

  const now = Date.now();
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > ALLOWED_DRIFT_MS) {
    return { ok: false as const, status: 401 };
  }

  const expected = expectedSignature(secret, timestamp, nonce);
  const provided = signature.toLowerCase();
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false as const, status: 401 };
  }

  const cache = getCache();
  prune(cache, now);

  if (cache.nonces.has(nonce)) {
    return { ok: false as const, status: 409 };
  }
  cache.nonces.set(nonce, now + ALLOWED_DRIFT_MS);

  const key = source || "unknown";
  const existing = cache.rate.get(key) ?? [];
  existing.push(now);
  cache.rate.set(key, existing);
  if (existing.length > MAX_REQUESTS_PER_MINUTE) {
    return { ok: false as const, status: 429 };
  }

  return { ok: true as const };
}
