import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  env: {
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || process.env.NEXT_PUBLIC_OLLAMA_MODEL || "",
    OLLAMA_URL: process.env.OLLAMA_URL || process.env.NEXT_PUBLIC_OLLAMA_URL || "http://127.0.0.1:11434",
    OLLAMA_MODE: process.env.OLLAMA_MODE || "local",
  },
};

export default nextConfig;
