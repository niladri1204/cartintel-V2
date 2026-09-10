import { describe, test, expect, afterEach } from "vitest";
import nextConfig from "../../../next.config.js";
import { middleware } from "../../../middleware";
import { NextRequest } from "next/server";

describe("Production Security Headers & Nonce-Based CSP", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  test("next.config.js returns empty headers in development mode", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const headersConfig = await nextConfig.headers();
    expect(headersConfig).toEqual([]);
  });

  test("next.config.js returns base security headers in production mode", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const headersConfig = await nextConfig.headers();
    expect(headersConfig).toHaveLength(1);
    expect(headersConfig[0].source).toBe("/(.*)");

    const headers = headersConfig[0].headers;
    const headerMap = new Map(headers.map((h: { key: string; value: string }) => [h.key, h.value]));

    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerMap.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(), payment=()");
  });

  test("middleware generates cryptographically secure nonce-based CSP per request", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const request1 = new NextRequest("https://cartintel.com/");
    const response1 = middleware(request1);

    const csp1 = response1.headers.get("Content-Security-Policy");
    expect(csp1).toBeDefined();

    // Must not contain broad unsafe-inline in script-src
    expect(csp1).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp1).toContain("'strict-dynamic'");

    // Must contain nonce in script-src and style-src
    const nonceMatch1 = csp1!.match(/'nonce-([A-Za-z0-9+/=_-]+)'/);
    expect(nonceMatch1).not.toBeNull();
    const nonce1 = nonceMatch1![1];
    expect(nonce1.length).toBeGreaterThanOrEqual(16);

    // Verify preservation of required security directives
    expect(csp1).toContain("frame-ancestors 'none'");
    expect(csp1).toContain("object-src 'none'");
    expect(csp1).toContain("base-uri 'self'");
    expect(csp1).toContain("img-src 'self' data: https:");
    expect(csp1).toContain("connect-src 'self' https:");
    expect(csp1).toContain("font-src 'self' https://fonts.gstatic.com");

    // Must generate unique nonces per request
    const request2 = new NextRequest("https://cartintel.com/");
    const response2 = middleware(request2);
    const csp2 = response2.headers.get("Content-Security-Policy");
    const nonceMatch2 = csp2!.match(/'nonce-([A-Za-z0-9+/=_-]+)'/);
    const nonce2 = nonceMatch2![1];

    expect(nonce1).not.toBe(nonce2);
  });
});
