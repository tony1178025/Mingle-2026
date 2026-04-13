import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1"]
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true
});

export default withPWA(nextConfig);
