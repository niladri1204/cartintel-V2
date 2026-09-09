/// <reference types="vite/client" />
import { getApiBaseUrl } from "../config/api";

export function emitOfferTrace(stage: string, rawItems: any[], printDetails = false): void {
  // In production builds, skip verbose debug traces and disable /api/log-trace network requests.
  if (!import.meta.env.DEV) {
    return;
  }

  const prods = rawItems.map(item => item?.product || item).filter(Boolean);
  const count = rawItems.length;
  const merchants = Array.from(new Set(prods.map(p => p?.metadata?.marketplace || (p as any)?.source || "unknown").filter(Boolean)));
  const fps = Array.from(new Set(prods.map(p => p?.fingerprint || p?.normalizedTitle || "unknown").filter(Boolean)));
  const urls = prods.filter(p => Boolean(p?.originalUrl || p?.url)).length;
  const resolved = prods.filter(p => Boolean(p?.originalUrl || p?.url) && !String(p?.originalUrl || p?.url).includes("google.com")).length;

  const lines: string[] = [
    `[OFFER TRACE] stage=${stage}`,
    `[OFFER TRACE] count=${count}`,
    `[OFFER TRACE] merchants=${merchants.join(", ") || "none"}`,
    `[OFFER TRACE] products=${fps.join(", ") || "none"}`,
    `[OFFER TRACE] urls=${urls}`,
    `[OFFER TRACE] resolved=${resolved}`,
  ];

  if (printDetails) {
    for (const item of rawItems) {
      const p = item?.product || item;
      const merchant = p?.metadata?.marketplace || (p as any)?.source || "unknown";
      const fingerprint = p?.fingerprint || p?.normalizedTitle || "unknown";
      const title = p?.originalTitle || p?.normalizedTitle || "unknown";
      const originalUrl = p?.originalUrl || p?.url || "none";
      const res = Boolean(originalUrl && originalUrl !== "none" && !originalUrl.includes("google.com"));
      const isEligible = !item?.isUnavailable;
      const rankingTier = item?.finalRankingScore ?? item?.identityConfidenceScore ?? p?.confidence ?? 0;
      lines.push(
        `[OFFER TRACE ITEM] merchant=${merchant} | fingerprint=${fingerprint} | title="${title}" | originalUrl=${originalUrl} | resolved=${res} | isEligible=${isEligible} | rankingTier=${rankingTier}`
      );
    }
  }

  // 1. Browser Console (Development only)
  for (const line of lines) {
    console.log(line);
  }

  // 2. Terminal Output (via background fetch, Development only)
  try {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/log-trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: lines }),
    }).catch(() => {});
  } catch {}
}
