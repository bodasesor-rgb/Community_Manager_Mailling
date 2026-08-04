import type { NextConfig } from "next";
import path from "node:path";

const adaptersRoot = path.resolve(__dirname, "../src");

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      "@adapters": adaptersRoot,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@adapters": adaptersRoot,
    };
    // Los adaptadores usan imports ESM con sufijo .js apuntando a .ts
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
