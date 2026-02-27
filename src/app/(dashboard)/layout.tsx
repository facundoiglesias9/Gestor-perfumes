"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { AppProvider, useAppContext } from "@/context/AppContext";

function DashboardContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser, mounted } = useAppContext();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!mounted) return;

        // 1. Authentication check
        if (!currentUser) {
            router.push("/login");
            return;
        }

        // 2. Authorization check
        const role = currentUser.role;

        // Define accessible paths per role
        const retailerPaths = ["/minorista", "/pedidos-solicitud"];
        const wholesalerPaths = ["/", "/pedidos-solicitud"];
        // Admin has access to everything

        if (role === "admin") {
            setIsAuthorized(true);
        } else if (role === "minorista") {
            if (retailerPaths.includes(pathname)) {
                setIsAuthorized(true);
            } else {
                router.push("/minorista");
            }
        } else if (role === "mayorista") {
            if (wholesalerPaths.includes(pathname)) {
                setIsAuthorized(true);
            } else {
                router.push("/");
            }
        }
    }, [currentUser, pathname, mounted, router]);

    if (!mounted || !isAuthorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
                <div className="animate-pulse text-indigo-600 dark:text-indigo-400 font-bold">Cargando acceso...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] overflow-hidden font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-100 transition-colors duration-300 print:h-auto print:overflow-visible print:bg-white print:text-black">
            {/* Sidebar Container */}
            <div className="print:hidden flex shrink-0 z-50">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full relative transition-colors duration-300 print:overflow-visible print:h-auto print:bg-white print:text-black">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20 pointer-events-none print:hidden"></div>
                <div className="p-10 max-w-7xl mx-auto xl:px-16 2xl:max-w-screen-2xl relative z-10 w-full transition-all print:p-0 print:max-w-none print:m-0">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return <DashboardContent>{children}</DashboardContent>;
}
