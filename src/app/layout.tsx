import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scenta",
  description: "Gestión de Perfumería y Esencias",
  icons: {
    icon: "/logo-scenta.png",
  },
  generator: "Scenta v1.0.2 - Force Redeploy",
};

import { AppProvider } from "@/context/AppContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
