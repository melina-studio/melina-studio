import type { NextConfig } from "next";
import { withNextDevtools } from "@next-devtools/core/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
};

export default withNextDevtools(nextConfig);
