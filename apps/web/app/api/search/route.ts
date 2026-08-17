import { NextResponse } from "next/server";
import { searchService } from "../../../server/services/search";
import type { SearchRequest } from "../../../server/services/search/types";

// Allow cross-origin requests from the Chrome extension
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
    const requestData = (await req.json()) as SearchRequest;
    
    // Basic validation to ensure we received a valid request
    if (!requestData || !requestData.fingerprint) {
      return NextResponse.json(
        { error: "Invalid search request. Missing fingerprint." },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await searchService.search(requestData);

    // Surface backend provider errors properly if no results were found
    if (result.results.length === 0 && result.errors.length > 0) {
      const errorMsg = result.errors.map(e => `${e.providerId}: ${e.error}`).join(" | ");
      return NextResponse.json(
        { error: errorMsg },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("CartIntel Backend API Error:", error);
    return NextResponse.json(
      { error: "Internal server error during search." },
      { status: 500, headers: corsHeaders }
    );
  }
}
