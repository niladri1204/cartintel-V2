import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body && Array.isArray(body.logs)) {
      for (const line of body.logs) {
        console.log(line);
      }
    } else if (body && typeof body.message === "string") {
      console.log(body.message);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
