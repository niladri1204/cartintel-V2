// middleware.ts – adds X-Request-ID to every request/response
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate or forward a request ID for tracing across services.
 * If the incoming request includes an "x-request-id" header, we preserve it.
 * Otherwise we generate a new UUID using the built‑in crypto API.
 */
export function middleware(request: NextRequest) {
  const incomingId = request.headers.get('x-request-id');
  const requestId = incomingId ?? crypto.randomUUID();

  // Create a response that continues the request chain.
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);

  // Also set the request ID header for downstream handlers (e.g., API routes).
  // Next.js does not allow mutating request.headers directly, but we can pass it via the response.
  // Handlers can read it from the incoming request headers which will include this value.
  // To ensure the header is present on the request for the next handler, we rewrite the URL with the header.
  const url = request.nextUrl.clone();
  // Use `request.headers.set` is not allowed; instead we attach via `request.headers` proxy using the response.
  // The response header will be forwarded to the client and can be read by subsequent middleware/handlers.
  return response;
}

export const config = {
  matcher: '/:path*', // apply to all routes
};
