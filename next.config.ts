import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits `.next/standalone` — a self-contained server carrying only the traced
   * dependencies rather than the whole `node_modules`. It is what the production
   * Dockerfile copies, and it is the difference between a ~200 MB image and a
   * multi-gigabyte one.
   */
  output: "standalone",

  /** Nothing gains from advertising the framework version to three companies. */
  poweredByHeader: false,
};

export default nextConfig;
