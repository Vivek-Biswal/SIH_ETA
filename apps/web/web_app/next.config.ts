import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose to client bundle at build time (for server components / getStaticProps)
    MAPTILER_API_KEY: process.env.MAPTILER_API_KEY ?? '',
    // NEXT_PUBLIC_ prefix makes it available in all client components reliably
    NEXT_PUBLIC_MAPTILER_API_KEY: process.env.MAPTILER_API_KEY ?? '',
  },
};

export default nextConfig;
