import { NextResponse } from "next/server";
import { intelligencePersistenceService } from "../../../server/services/persistence/intelligencePersistenceService";

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
    const result = await intelligencePersistenceService.persistRecommendationTransaction(body);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("[POST /api/persist] Uncaught error handled safely:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error during persistence",
      },
      { headers: corsHeaders }
    );
  }
}
