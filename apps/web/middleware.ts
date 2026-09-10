// middleware.ts – generates per-request nonce for CSP and adds X-Request-ID for tracing
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const incomingId = request.headers.get('x-request-id');
  const requestId = incomingId ?? crypto.randomUUID();

  // Generate cryptographically secure per-request nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const isProduction = process.env.NODE_ENV === 'production';
  const scriptSrc = isProduction
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https:;
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
  `.replace(/\s{2,}/g, ' ').trim();

  // Forward nonce and request ID to downstream components and Next.js internal rendering
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach headers to outgoing response
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except internal static assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static images, favicon
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
    '/api/:path*',
  ],
};
