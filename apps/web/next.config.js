/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production‑only security headers
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      {
        key: 'Content-Security-Policy',
        // No inline scripts, but React style props need unsafe-inline for styles.
        value: "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
      },
    ];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
