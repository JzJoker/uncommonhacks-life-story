import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.16.0.114"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
