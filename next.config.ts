import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for pdf-parse to work in serverless functions
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
