// apps/web/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { corsHeaders, rejectUnauthorizedOrigin } from '../../../server/security/requestSecurity';

export async function OPTIONS(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request);
  return rejected ?? new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  // Stateless health check – no DB or external calls
  return NextResponse.json({ status: "ok" }, { status: 200, headers: corsHeaders(request) });
}
