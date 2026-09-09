/// <reference types="vite/client" />

/**
 * Centralized API base configuration for CartIntel Chrome Extension.
 *
 * In production builds:
 * - VITE_CARTINTEL_API_URL is required at build time.
 * - If absent, throws an explicit configuration Error. Never silently falls back to localhost or empty string.
 *
 * In development builds (import.meta.env.DEV):
 * - Defaults to "http://localhost:3000" if VITE_CARTINTEL_API_URL is not set.
 */
export function getApiBaseUrl(): string {
  const configured = (typeof import.meta !== "undefined" && import.meta.env?.VITE_CARTINTEL_API_URL)?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return "http://localhost:3000";
  }

  throw new Error("VITE_CARTINTEL_API_URL is required for production builds");
}
