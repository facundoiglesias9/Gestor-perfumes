"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/context/AppContext";

// Rutas públicas que no usan el sistema interno: no cargan costos,
// usuarios ni pedidos, y no esperan a que se inicialice toda la base.
const PUBLIC_PREFIXES = ["/catalogo"];

export default function AppProviderGate({ children }: { children: ReactNode }) {
    const pathname = usePathname() ?? "";
    const isPublic = PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));

    if (isPublic) return <>{children}</>;
    return <AppProvider>{children}</AppProvider>;
}
