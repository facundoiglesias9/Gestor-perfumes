import type { NextConfig } from "next";

const nextConfig: any = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yomgpeherwpqtslegjcb.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disponibilidad pasó a ser parte de la página Catálogo
  async redirects() {
    return [{ source: "/disponibilidad", destination: "/mi-catalogo", permanent: false }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
