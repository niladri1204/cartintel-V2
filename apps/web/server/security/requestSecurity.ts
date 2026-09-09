import { NextResponse } from "next/server";

type Endpoint = "search" | "visual" | "persist" | "log-trace";

const endpointLimits: Record<Endpoint, { limit: number; windowSeconds: number }> = {
  search: { limit: 12, windowSeconds: 60 },
  visual: { limit: 4, windowSeconds: 60 },
  persist: { limit: 30, windowSeconds: 60 },
  "log-trace": { limit: 10, windowSeconds: 60 },
};

const localBuckets = new Map<string, { count: number; resetAt: number }>();

function configuredOrigins(): Set<string> {
  return new Set((process.env.CARTINTEL_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean));
}

function configuredExtensionOrigins(): Set<string> {
  return new Set((process.env.CARTINTEL_EXTENSION_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-p]{32}$/.test(id))
    .map((id) => `chrome-extension://${id}`));
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Non-browser callers do not participate in CORS.
  const normalized = origin.replace(/\/$/, "");
  if (configuredOrigins().has(normalized) || configuredExtensionOrigins().has(normalized)) return true;
  return process.env.NODE_ENV !== "production" && (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized) ||
    /^chrome-extension:\/\/[a-p]{32}$/.test(normalized)
  );
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return origin && isAllowedOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

export function rejectUnauthorizedOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) return NextResponse.json({ error: "Origin is not allowed." }, { status: 403, headers: corsHeaders(request) });
  return null;
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<{ value: unknown } | { error: NextResponse }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.startsWith("application/json")) return { error: NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers: corsHeaders(request) }) };
  if (!Number.isFinite(contentLength) || contentLength > maxBytes) return { error: NextResponse.json({ error: "Request body is too large." }, { status: 413, headers: corsHeaders(request) }) };
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) return { error: NextResponse.json({ error: "Request body is too large." }, { status: 413, headers: corsHeaders(request) }) };
    return { value: JSON.parse(text) };
  } catch {
    return { error: NextResponse.json({ error: "Malformed JSON request body." }, { status: 400, headers: corsHeaders(request) }) };
  }
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || request.headers.get("origin") || "unknown";
}

async function upstashLimit(key: string, limit: number, windowSeconds: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(`${url}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSeconds), "NX"]]) });
  if (!response.ok) throw new Error(`Upstash limiter response ${response.status}`);
  const result: Array<{ result: unknown }> = await response.json();
  return typeof result[0]?.result === "number" && result[0].result <= limit;
}

export async function rateLimit(request: Request, endpoint: Endpoint): Promise<NextResponse | null> {
  const { limit, windowSeconds } = endpointLimits[endpoint];
  const key = `cartintel:rate:${endpoint}:${clientKey(request)}`;
  try {
    const remote = await upstashLimit(key, limit, windowSeconds);
    if (remote === false) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: corsHeaders(request) });
    if (remote === true) return null;
    if (process.env.NODE_ENV === "production") {
      console.error("[rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.");
      return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503, headers: corsHeaders(request) });
    }
    const now = Date.now();
    const bucket = localBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) localBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    else if (++bucket.count > limit) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: corsHeaders(request) });
    return null;
  } catch (error) {
    console.error("[rate-limit] backend failure", error);
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503, headers: corsHeaders(request) });
  }
}
