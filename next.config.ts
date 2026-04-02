import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ['192.168.0.26', '*.ngrok-free.app', '*.ngrok.io'],
};

export default nextConfig;
