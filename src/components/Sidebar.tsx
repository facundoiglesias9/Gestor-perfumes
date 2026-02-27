"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import {
    Tags,
    Store,
    Layers,
    FlaskConical,
    ShoppingCart,
    ListTree,
    LogOut,
    Sparkles,
    Archive,
    ChevronDown,
    Plus,
    Users,
    Wallet,
    Shield,
    ShoppingBag,
    Printer
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const menuSections = [
    {
        title: "Gestión Comercial",
        key: "comercial",
        items: [
            { href: "/", label: "Lista Mayorista", icon: Tags },
            { href: "/minorista", label: "Lista Minorista", icon: Store },
            { href: "/bases", label: "Bases de Productos", icon: Layers },
            { href: "/crear-producto", label: "Crear Producto", icon: Plus },
        ]
    },
    {
        title: "Inventario & Costos",
        key: "inventario",
        items: [
            { href: "/pedidos", label: "Pedido Mayorista", icon: ShoppingCart },
            { href: "/inventario", label: "Inventario Físico", icon: Archive },
            { href: "/insumos", label: "Insumos", icon: Layers },
            { href: "/esencias", label: "Esencias", icon: FlaskConical },
        ]
    },
    {
        title: "Monetización",
        key: "monetizacion",
        items: [
            { href: "/caja", label: "Caja Unificada", icon: Wallet },
            { href: "/pedidos-solicitud", label: "Solicitud de Pedidos", icon: ShoppingBag },
            { href: "/ventas-revendedores", label: "Ventas Revendedores", icon: ListTree },
        ]
    },
    {
        title: "Configuración",
        key: "configuracion",
        items: [
            { href: "/proveedores", label: "Proveedores", icon: Users },
            { href: "/categorias", label: "Categorías", icon: ListTree },
            { href: "/generos", label: "Géneros", icon: FlaskConical },
            { href: "/usuarios", label: "Gestión de Usuarios", icon: Users },
            { href: "/categoria-usuarios", label: "Categoría de Usuarios", icon: Tags },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const { currentUser, logout } = useAppContext(); // Destructured currentUser and logout
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggleSection = (key: string) => {
        setOpenSection(prev => prev === key ? null : key);
    };

    const filteredSections = menuSections.map(section => {
        // Filter items within the section
        const filteredItems = section.items.filter(item => {
            if (!currentUser) return true; // Show all while loading or if not role-restricted
            if (currentUser.role === "admin") return true;
            if (currentUser.role === "minorista") {
                return item.href === "/minorista" || item.href === "/pedidos-solicitud";
            }
            if (currentUser.role === "mayorista") {
                return item.href === "/" || item.href === "/pedidos-solicitud";
            }
            return false;
        });

        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    return (
        <aside className="w-[300px] bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative transition-colors duration-300">
            {/* Logo Area */}
            <div className="h-24 flex items-center justify-between px-8 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl tracking-tighter">
                    <div className="relative p-2 rounded-xl bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                            <defs>
                                <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#6366f1" />
                                    <stop offset="1" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                            {/* Perfume Bottle Silhouette */}
                            <path d="M12 12C12 10.8954 12.8954 10 14 10H26C27.1046 10 28 10.8954 28 12V14C28 15.1046 27.1046 16 26 16H14C12.8954 16 12 15.1046 12 14V12Z" fill="url(#logo-grad)" />
                            <path d="M10 17C10 15.8954 10.8954 15 12 15H28C29.1046 15 30 15.8954 30 17V32C30 35.3137 27.3137 38 24 38H16C12.6863 38 10 35.3137 10 32V17Z" fill="url(#logo-grad)" opacity="0.3" />
                            <path d="M14 17C14 16.4477 14.4477 16 15 16H25C25.5523 16 26 16.4477 26 17V30C26 31.6569 24.6569 33 23 33H17C15.3431 33 14 31.6569 14 30V17Z" stroke="url(#logo-grad)" strokeWidth="2.5" />
                            {/* The Essence Drop */}
                            <path d="M20 20C20 20 17 23.5 17 25C17 26.6569 18.3431 28 20 28C21.6569 28 23 26.6569 23 25C23 23.5 20 20 20 20Z" fill="url(#logo-grad)" />
                        </svg>
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 font-black animate-gradient-x">
                        Essence<span className="text-slate-900 dark:text-slate-100 font-semibold opacity-50 underline decoration-indigo-500/30 underline-offset-4">Pro</span>
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-5 py-6 space-y-4 overflow-y-auto custom-scrollbar">
                {(!currentUser || currentUser.role === "admin") && (
                    <div className="space-y-1.5 mb-6">
                        <Link
                            href="/dashboard"
                            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/dashboard"
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                                : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                                }`}
                        >
                            <Sparkles className={`w-5 h-5 transition-transform duration-300 ${pathname === "/dashboard"
                                ? "text-indigo-500 group-hover:scale-110"
                                : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                                }`} />
                            Dashboard
                        </Link>
                    </div>
                )}

                {(!currentUser || currentUser.role === "admin") ? (
                    filteredSections.map((section, idx) => (
                        <div key={idx} className="space-y-1.5">
                            <button
                                onClick={() => toggleSection(section.key)}
                                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                            >
                                {section.title}
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openSection === section.key ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`space-y-1.5 overflow-hidden transition-all duration-300 ${openSection === section.key ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                                }`}>
                                {section.items.map((item, itemIdx) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={itemIdx}
                                            href={item.href}
                                            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${isActive
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                                                : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive
                                                ? "text-indigo-500 group-hover:scale-110"
                                                : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                                                }`} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="space-y-1.5 mt-2">
                        {filteredSections.flatMap(s => s.items).map((item, itemIdx) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={itemIdx}
                                    href={item.href}
                                    className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${isActive
                                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                                        : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive
                                        ? "text-indigo-500 group-hover:scale-110"
                                        : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                                        }`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {(!currentUser || currentUser.role === "admin") && (
                    <div className="space-y-1.5 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                        <Link
                            href="/generacion-etiquetas"
                            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/generacion-etiquetas"
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                                : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                                }`}
                        >
                            <Printer className={`w-5 h-5 transition-transform duration-300 ${pathname === "/generacion-etiquetas"
                                ? "text-indigo-500 group-hover:scale-110"
                                : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                                }`} />
                            Generación de Etiquetas
                        </Link>
                    </div>
                )}
            </nav>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                {currentUser ? (
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                            {currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{currentUser.username}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
                                {currentUser.role}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-2 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-12"></div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={logout}
                        className="flex-1 flex items-center justify-center gap-3.5 px-4 py-3.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 font-bold transition-all group border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                    >
                        <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </aside>
    );
}
