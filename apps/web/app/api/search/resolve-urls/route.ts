import { NextResponse } from "next/server";
import { directMerchantUrlResolver } from "../../../../server/services/search/directMerchantUrlResolver";
import type { RawProductResult, SearchRequest } from "../../../../server/services/search/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const offers = (body.offers || []) as RawProductResult[];
    const searchRequest: SearchRequest = {
      normalizedTitle: body.normalizedTitle || "",
      brand: body.brand || null,
      model: body.model || null,
      category: body.category || null,
      productType: body.productType || null,
      variant: body.variant || null,
      color: body.color || null,
      storage: body.storage || null,
      ram: body.ram || null,
      fingerprint: body.fingerprint || "unknown",
    };

    const apiKey = process.env.SERPER_API_KEY;

    if (offers.length > 0 && apiKey) {
      await directMerchantUrlResolver.resolveMissingMerchantUrls(offers, searchRequest, apiKey);
    }

    return NextResponse.json({ resolvedOffers: offers }, { headers: corsHeaders });
  } catch (error) {
    console.error("[ResolveURLs] Error resolving merchant URLs:", error);
    return NextResponse.json(
      { resolvedOffers: [], error: "Failed to resolve merchant URLs" },
      { status: 500, headers: corsHeaders }
    );
  }
}
