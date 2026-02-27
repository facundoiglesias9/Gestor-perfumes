"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { Menu, X } from "lucide-react";

function DashboardContent({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser, mounted } = useAppContext();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        const wholesalerPaths = ["/", "/pedidos-solicitud", "/historial-compras", "/notas", "/dashboard-mayorista"];
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
        <div className="flex flex-col lg:flex-row h-screen bg-slate-50 dark:bg-[#0f172a] overflow-hidden font-sans text-slate-900 dark:text-slate-50 selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-100 transition-colors duration-300 print:h-auto print:overflow-visible print:bg-white print:text-black">

            {/* Mobile Header */}
            <div className="lg:hidden flex shrink-0 items-center justify-between p-5 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 z-40 shadow-sm relative">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl tracking-tighter">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 font-black">
                        Essence<span className="text-slate-900 dark:text-slate-100 font-semibold opacity-50 underline decoration-indigo-500/30 underline-offset-4">Pro</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {currentUser && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-500/20">
                            {currentUser.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6 pointer-events-none" /> : <Menu className="w-6 h-6 pointer-events-none" />}
                    </button>
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-50 flex shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} print:hidden`}>
                <Sidebar onClose={() => setIsSidebarOpen(false)} />
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
