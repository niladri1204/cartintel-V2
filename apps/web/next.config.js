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
    ];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
