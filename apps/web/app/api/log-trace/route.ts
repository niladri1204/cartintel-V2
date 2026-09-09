import { NextResponse } from "next/server";
import { corsHeaders, rateLimit, readJsonBody, rejectUnauthorizedOrigin } from "../../../server/security/requestSecurity";

export async function OPTIONS(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request);
  return rejected ?? new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const rejected = rejectUnauthorizedOrigin(request); if (rejected) return rejected;
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found." }, { status: 404, headers: corsHeaders(request) });
  const limited = await rateLimit(request, "log-trace"); if (limited) return limited;
  const parsed = await readJsonBody(request, 8 * 1024); if ("error" in parsed) return parsed.error;
  const body = parsed.value;
  const validLogs = body && typeof body === "object" && !Array.isArray(body) && ((Array.isArray((body as { logs?: unknown }).logs) && (body as { logs: unknown[] }).logs.length <= 20 && (body as { logs: unknown[] }).logs.every((line) => typeof line === "string" && line.length <= 500)) || (typeof (body as { message?: unknown }).message === "string" && (body as { message: string }).message.length <= 500));
  if (!validLogs) return NextResponse.json({ ok: false, error: "Invalid trace payload." }, { status: 400, headers: corsHeaders(request) });
  if (Array.isArray((body as { logs?: string[] }).logs)) for (const line of (body as { logs: string[] }).logs) console.log(`[extension trace] ${line}`);
  else console.log(`[extension trace] ${(body as { message: string }).message}`);
  return NextResponse.json({ ok: true }, { headers: corsHeaders(request) });
}
