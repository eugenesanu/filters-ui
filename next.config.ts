import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: import.meta.dirname },
  // Lab pages make stills on a dev server only. In production they would prerender as an error shell without the
  // theme script, so their addresses go straight to the site's own 404 page.
  async rewrites() {
    if (process.env.NODE_ENV !== "production") return [];
    return { beforeFiles: [{ source: "/lab/:path*", destination: "/lab-off" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
