import type { NextConfig } from "next";
import path from "path";

const repoName = "amore-global-travels";
const isGithubPages = process.env.GITHUB_PAGES === "true";
const isApiBackend = process.env.NEXT_PUBLIC_DATA_BACKEND === "api";
const isDev = process.env.NODE_ENV === "development";
const useStaticExport = isGithubPages || (!isDev && !isApiBackend);
const basePath = isGithubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  ...(useStaticExport ? { output: "export" as const } : {}),
  trailingSlash: useStaticExport,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_HAS_API: useStaticExport ? "0" : "1",
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
