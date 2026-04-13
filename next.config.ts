import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;
