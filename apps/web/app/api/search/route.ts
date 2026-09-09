import { NextResponse } from "next/server";
import { searchService } from "../../../server/services/search";
import type { SearchRequest } from "../../../server/services/search/types";
import { corsHeaders, rateLimit, readJsonBody, rejectUnauthorizedOrigin } from "../../../server/security/requestSecurity";

const MAX_TEXT = 300;
const optionalStrings = ["normalizedTitle", "brand", "model", "category", "productType", "variant", "color", "storage", "ram", "googleProductId", "googleImmersiveToken"] as const;

function validSearchRequest(value: unknown): value is SearchRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (typeof request.fingerprint !== "string" || !request.fingerprint.trim() || request.fingerprint.length > MAX_TEXT) return false;
  if (request.useSellerExpansion !== undefined && typeof request.useSellerExpansion !== "boolean") return false;
  return optionalStrings.every((field) => request[field] === undefined || request[field] === null || (typeof request[field] === "string" && request[field].length <= MAX_TEXT));
}

export async function OPTIONS(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request);
  return rejected ?? new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request); if (rejected) return rejected;
  const limited = await rateLimit(request, "search"); if (limited) return limited;
  const parsed = await readJsonBody(request, 16 * 1024); if ("error" in parsed) return parsed.error;
  if (!validSearchRequest(parsed.value)) return NextResponse.json({ error: "Invalid search request." }, { status: 400, headers: corsHeaders(request) });
  try {
    const result = await searchService.search(parsed.value);
    if (result.results.length === 0 && result.errors.length > 0) {
      console.error("[POST /api/search] providers failed", result.errors.map((error) => error.providerId));
      return NextResponse.json({ error: "Search providers are temporarily unavailable." }, { status: 502, headers: corsHeaders(request) });
    }
    return NextResponse.json(result, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[POST /api/search] failed", error);
    return NextResponse.json({ error: "Internal server error during search." }, { status: 500, headers: corsHeaders(request) });
  }
}
