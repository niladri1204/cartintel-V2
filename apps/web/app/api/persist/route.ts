import { NextResponse } from "next/server";
import { intelligencePersistenceService } from "../../../server/services/persistence/intelligencePersistenceService";
import { sanitizeError } from '../../../utils/apiError';
import { rejectUnauthorizedOrigin, corsHeaders, rateLimit, readJsonBody } from '../../../server/security/requestSecurity';

function validPersistenceRequest(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return !!body.anchorProduct && typeof body.anchorProduct === "object" && !Array.isArray(body.anchorProduct) && Array.isArray(body.offers) && body.offers.length <= 100;
}

export async function OPTIONS(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request);
  return rejected ?? new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request); if (rejected) return rejected;
  const limited = await rateLimit(request, "persist"); if (limited) return limited;
  const parsed = await readJsonBody(request, 256 * 1024); if ("error" in parsed) return parsed.error;
  if (!validPersistenceRequest(parsed.value)) return NextResponse.json({ success: false, error: "Invalid persistence request." }, { status: 400, headers: corsHeaders(request) });
  try {
    const result = await intelligencePersistenceService.persistRecommendationTransaction(parsed.value);
    return NextResponse.json(result, { headers: corsHeaders(request) });
    } catch (error) {
      console.error("[POST /api/persist] failed", error);
      const { status, body } = sanitizeError(error);
      return NextResponse.json(body, { status, headers: corsHeaders(request) });
    }
}
