import type { NextConfig } from "next";
import path from "node:path";

const dashboardRoot = __dirname;
const repositoryRoot = path.resolve(dashboardRoot, "..");

const nextConfig: NextConfig = {
  // The dashboard imports shared worker modules from ../src. Resolve those
  // modules and their server-only dependencies within this monorepo checkout.
  outputFileTracingRoot: repositoryRoot,
  turbopack: {
    root: repositoryRoot,
  },
  // Prisma is normally externalized by Next.js. Bundle it through the
  // dashboard's installed client so shared ../src imports use this package.
  transpilePackages: ["@prisma/client", "pino"],
};

export default nextConfig;
