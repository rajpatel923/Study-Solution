import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  serverActions: {
    bodySizeLimit: "10mb", // Increase the limit to 10MB or adjust as needed
  },
};

export default nextConfig;
