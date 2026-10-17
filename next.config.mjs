/** @type {import('next').NextConfig} */

/**
 * Content-Security-Policy.
 * 'unsafe-inline' on style-src is required by Next's inlined critical CSS
 * and our inline style objects; script 'unsafe-inline' is required by Next's
 * hydration bootstrap. Everything else is locked to self + the specific
 * third parties we actually load.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://news.google.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // raw.githubusercontent.com and cdn.cosmos.so were removed once the landing
  // images moved into public/design — every image is now same-origin. The
  // gstatic/googleusercontent hosts are required by the Google Preferred
  // Sources button.
  "img-src 'self' data: blob: https://news.google.com https://www.gstatic.com https://ssl.gstatic.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://hazjyonpqungkgchqgro.supabase.co https://news.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src https://news.google.com",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Pin the workspace root. Without this Next walks up and can pick a
  // stray parent-directory lockfile, which changes what gets traced into
  // the serverless bundle.
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Never cache authenticated/personalised responses.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The old combined page is now two pages.
      { source: "/legal", destination: "/privacy", permanent: true },
      // The paid flow is retired.
      { source: "/success", destination: "/thank-you", permanent: false },
    ];
  },
};

export default nextConfig;
