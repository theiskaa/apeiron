/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure markdown + categories.json are bundled into the server output so
  // filesystem reads in lib/content.ts resolve at runtime on Cloudflare Workers
  // (OpenNext packages traced files under /bundle).
  outputFileTracingIncludes: {
    "/**/*": ["./content/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "apeirron.com" }],
        destination: "https://www.apeirron.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
