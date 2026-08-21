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
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#F9F6F0] dark:bg-[#1B1D1A]" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800;900&family=Cormorant+Garamond:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (theme === 'dark' || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[#F9F6F0] dark:bg-[#1B1D1A]">
        <AppProvider>
          {children}
          <Toaster 
            position="top-right" 
            theme="system" 
            richColors 
            expand={false}
          />
        </AppProvider>
      </body>
    </html>
  );
}
