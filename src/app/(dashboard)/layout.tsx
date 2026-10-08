"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { useAppContext } from "@/context/AppContext";
import { puedeVer } from "@/lib/permisos";
import { CheckCircle2, Loader2 } from "lucide-react";
import { MotionConfig } from "framer-motion";

function DashboardContent({ children }: { children: ReactNode }) {
    const { mounted, currentUser, logout } = useAppContext();
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    // El sistema interno es solo para administradores. Sin sesión -> login; una sesión vieja
    // de cliente (ya no existen cuentas de clientes) se cierra y va al catálogo.
    // Ojo: esto protege las pantallas, no la base (las server actions siguen abiertas, ver pendientes de seguridad).
    const expulsado = useRef(false);
    useEffect(() => {
        // Al cerrar la sesión del cliente, currentUser pasa a null y este efecto vuelve a correr:
        // sin esta marca lo mandaría al login en vez de al catálogo.
        if (!mounted || expulsado.current) return;
        if (!currentUser) {
            setIsAuthorized(false);
            router.replace("/login");
        } else if (!puedeVer(currentUser.role, pathname)) {
            setIsAuthorized(false);
            expulsado.current = true;
            logout();
            router.replace("/catalogo");
        } else {
            setIsAuthorized(true);
        }
    }, [mounted, currentUser, pathname, router]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!mounted || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-[#7D9878]/20 border-t-[#7D9878] animate-spin"></div>
                        <div className="w-8 h-8 bg-[#7D9878]/10 rounded-full flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            {isAuthorized ? <CheckCircle2 className="w-5 h-5 text-[#7D9878]" /> : <Loader2 className="w-4 h-4 text-[#7D9878] animate-pulse" />}
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-xl font-black text-[#7D9878] dark:text-[#A3B69B] animate-pulse font-brand">
                            {!mounted ? "Inicializando Datos" : "Verificando Permisos"}
                        </p>
                        <p className="text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mt-1">
                            Scenta v1.0.2 • Preparando catálogo
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F6F0] dark:bg-[#1B1D1A] font-sans text-[#2C2C2C] dark:text-[#F4EFEA] selection:bg-[#7D9878]/30 selection:text-white transition-colors duration-300 print:bg-white print:text-black">
            {/* Top Navigation Bar */}
            <TopNav />

            {/* Main Content Area */}
            <main className="flex-1 w-full relative transition-colors duration-300 print:overflow-visible print:bg-white print:text-black">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#DAC4AA_1px,transparent_1px)] dark:bg-[radial-gradient(#353B33_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20 pointer-events-none print:hidden"></div>

                <div className="p-6 md:p-10 max-w-[1800px] mx-auto relative z-10 w-full transition-all print:p-0 print:max-w-none print:m-0">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    // reducedMotion="user": quien pidió menos movimiento en su sistema no ve desplazamientos
    return (
        <MotionConfig reducedMotion="user">
            <DashboardContent>{children}</DashboardContent>
        </MotionConfig>
    );
}
