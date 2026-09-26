import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    MAPTILER_API_KEY: process.env.MAPTILER_API_KEY,
  }
};

export default nextConfig;
