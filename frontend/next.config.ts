import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'development'
    ? { allowedDevOrigins: ['127.0.0.1'] }
    : {}),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
