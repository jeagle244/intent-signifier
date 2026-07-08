import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/seed-db.ts reads data/target-companies.csv at runtime via fs —
  // make sure it's included in the serverless bundle for the seed route.
  outputFileTracingIncludes: {
    "/api/cron/seed": ["./data/target-companies.csv"],
  },
};

export default nextConfig;
