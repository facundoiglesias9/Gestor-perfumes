import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite todos los hosts para Supabase u otros
      },
    ],
  },
};

export default nextConfig;
