import type { NextConfig } from "next";
import path from "path";

const repoName = "amore-global-travels";
// GitHub Pages needs the repo base path. GoDaddy Node hosting and local
// dev serve from the domain root — leave GITHUB_PAGES unset there.
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  // Static HTML export: GoDaddy serves /out via server.js on process.env.PORT.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GoDaddy production install skips devDependencies; lint stays in CI/local.
  eslint: {
    ignoreDuringBuilds: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
