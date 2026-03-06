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
    Printer,
    ClipboardList,
    Percent,
    PieChart,
    StickyNote,
    Terminal
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
            { href: "/historial-compras", label: "Historial de Compras", icon: ClipboardList },
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
            { href: "/porcentaje-ganancia", label: "Porcentaje de Ganancia", icon: Percent },
            { href: "/logs", label: "Logs del Sistema", icon: Terminal },
        ]
    },
    {
        title: "Herramientas (Revendedores)",
        key: "tools",
        items: [
            { href: "/dashboard-mayorista", label: "Dashboard", icon: PieChart },
            { href: "/notas", label: "Notas", icon: StickyNote },
        ]
    }
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const { currentUser, logout } = useAppContext(); // Destructured currentUser and logout
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggleSection = (key: string) => {
        setOpenSection(prev => prev === key ? null : key);
    };

    const filteredSections = menuSections.map(section => {
        // Admin does not see the "Tools" section as it's for resellers
        if (currentUser?.role === "admin" && section.key === "tools") {
            return { ...section, items: [] };
        }

        // Filter items within the section
        const filteredItems = section.items.filter(item => {
            if (!currentUser) return true; // Show all while loading or if not role-restricted
            if (currentUser.role === "admin") return true;
            if (currentUser.role === "minorista") {
                return item.href === "/minorista" || item.href === "/pedidos-solicitud";
            }
            if (currentUser.role === "mayorista") {
                return ["/", "/pedidos-solicitud", "/historial-compras", "/dashboard-mayorista", "/notas"].includes(item.href);
            }
            return false;
        });

        return { ...section, items: filteredItems };
    }).filter(section => section.items.length > 0);

    return (
        <aside className="w-[300px] h-full bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative transition-colors duration-300">
            {/* Logo Area */}
            <div className="h-24 flex shrink-0 items-center justify-between px-8 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl tracking-tighter">
                    <div className="relative w-12 h-12 flex items-center justify-center p-0.5 rounded-full bg-slate-50 dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <img
                            src="/logo-scenta.png"
                            alt="Scenta Logo"
                            className="w-full h-full object-cover scale-150"
                        />
                    </div>
                    <span className="text-[#8b5cf6] dark:text-[#a78bfa] font-black tracking-tighter text-3xl">
                        Scenta
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-5 py-6 space-y-4 overflow-y-auto custom-scrollbar">
                {(!currentUser || currentUser.role === "admin") && (
                    <div className="space-y-1.5 mb-6">
                        <Link
                            href="/dashboard"
                            onClick={onClose}
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
                                            onClick={onClose}
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
                                    onClick={onClose}
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
                            href="/studio"
                            onClick={onClose}
                            className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/studio"
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                                : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                                }`}
                        >
                            <Sparkles className={`w-5 h-5 transition-transform duration-300 ${pathname === "/studio"
                                ? "text-indigo-500 group-hover:scale-110"
                                : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                                }`} />
                            Studio (Mockups)
                        </Link>

                        <Link
                            href="/generacion-etiquetas"
                            onClick={onClose}
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
