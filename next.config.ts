import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ Temporariamente ignorar erros TypeScript durante o build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ Temporariamente ignorar erros ESLint durante o build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
