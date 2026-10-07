"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Puerta de entrada del sitio: quien tiene sesión iniciada va al sistema interno;
// cualquier otra persona (un posible comprador) va al catálogo público.
// No usa AppContext a propósito: así no espera a que cargue toda la base.
export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        let tieneSesion = false;
        try { tieneSesion = !!localStorage.getItem("mockUser"); } catch { }
        router.replace(tieneSesion ? "/lista-precios" : "/catalogo");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
            <Loader2 className="w-8 h-8 text-[#7D9878] animate-spin" />
        </div>
    );
}
