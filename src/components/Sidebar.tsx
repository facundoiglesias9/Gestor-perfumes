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
    ClipboardList,
    Percent,
    PieChart,
    StickyNote,
    Terminal,
    Trophy,
    Bell,
    Check,
    Trash2,
    UserPlus,
    X,
    Info,
    ArrowRight,
    Image,
    Truck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const menuSections = [
    {
        title: "Gestión Comercial",
        key: "comercial",
        items: [
            { href: "/bases", label: "Bases de Productos", icon: Layers },
            { href: "/crear-producto", label: "Crear Producto", icon: Plus },
        ]
    },
    {
        title: "Inventario & Costos",
        key: "inventario",
        items: [
            { href: "/inventario", label: "Inventario Físico", icon: Archive },
            { href: "/insumos", label: "Insumos", icon: Layers },
            { href: "/esencias", label: "Esencias", icon: FlaskConical },
        ]
    },

    {
        title: "Configuración",
        key: "configuracion",
        items: [
            { href: "/parametros", label: "Parámetros y Clasificación", icon: ListTree },
            { href: "/porcentaje-ganancia", label: "Porcentaje de Ganancia", icon: Percent },
            { href: "/logs", label: "Logs del Sistema", icon: Terminal },
        ]
    },
    {
        title: "Herramientas (Revendedores)",
        key: "tools",
        items: [
            { href: "/notas", label: "Notas", icon: StickyNote },
        ]
    }
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const { currentUser, logout, notifications, unreadCount, markNotificationAsRead, clearNotifications, addSystemLog } = useAppContext(); 
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);

    const toggleSection = (key: string) => {
        setOpenSection(prev => prev === key ? null : key);
    };

    const filteredSections = menuSections.map(section => {
        // Admin does not see the "Tools" (resellers) or "Herramientas" if not admin?
        // Actually, let's keep it simple: admin sees commercial, inventory, monetization, config, and tools.
        if (currentUser?.role === "admin" && section.key === "tools") {
            return { ...section, items: [] };
        }

        // Filter items within the section
        const filteredItems = section.items.filter(item => {
            if (!currentUser) return true; // Show all while loading or if not role-restricted
            if (currentUser.role === "admin") {
                if (item.href === "/historial-compras") return false;
                return true;
            }
            if (currentUser.role === "minorista") {
                return ["/lista-precios", "/pedidos-solicitud"].includes(item.href);
            }
            if (currentUser.role === "mayorista") {
                return ["/lista-precios", "/pedidos-solicitud", "/historial-compras", "/notas"].includes(item.href);
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

                {currentUser && (
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200 dark:border-slate-800"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-[#1e293b] animate-bounce">
                                    {unreadCount > 9 ? "+9" : unreadCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                    className="fixed top-5 left-4 md:left-[320px] md:top-8 w-[calc(100vw-2rem)] md:w-[400px] max-h-[85vh] bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-[0_25px_80px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col z-[999]"
                                >
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                <Bell className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Notificaciones</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            {notifications.length > 0 && (
                                                <button 
                                                    onClick={clearNotifications}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Limpiar todas"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setShowNotifications(false)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[100px] max-h-[500px]">
                                        {notifications.length === 0 ? (
                                            <div className="py-20 text-center space-y-4 px-10">
                                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-800/50 shadow-inner">
                                                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                                                </div>
                                                <p className="text-sm text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-4">Bandeja de entrada vacía</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                                {notifications.map((notif) => (
                                                    <div 
                                                        key={notif.id}
                                                        className={`p-6 transition-all hover:bg-slate-50 dark:hover:bg-indigo-500/5 group relative ${!notif.read ? 'bg-indigo-50/20 dark:bg-indigo-500/10' : ''}`}
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className={`mt-0.5 w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 ${!notif.read ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                                <ShoppingBag className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate pr-6 tracking-tight">{notif.title}</p>
                                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                                        {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-3">{notif.message}</p>
                                                                <div className="flex items-center gap-4">
                                                                    <Link 
                                                                        href={notif.orderId ? "/pedidos-solicitud" : "#"}
                                                                        onClick={() => {
                                                                            markNotificationAsRead(notif.id);
                                                                            setShowNotifications(false);
                                                                        }}
                                                                        className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 transition-all hover:gap-2"
                                                                    >
                                                                        Gestionar Pedido <ArrowRight className="w-3.5 h-3.5" />
                                                                    </Link>
                                                                    {!notif.read && (
                                                                        <button 
                                                                            onClick={() => markNotificationAsRead(notif.id)}
                                                                            className="text-[11px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-widest transition-colors"
                                                                        >
                                                                            Ignorar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!notif.read && (
                                                            <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] border-2 border-white dark:border-[#1e293b]"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {notifications.length > 0 && (
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                                            <Link 
                                                href="/pedidos-solicitud"
                                                onClick={() => setShowNotifications(false)}
                                                className="group flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all uppercase tracking-widest"
                                            >
                                                <ClipboardList className="w-4 h-4 transition-transform group-hover:scale-110" />
                                                Ver historial completo
                                            </Link>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-5 py-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="space-y-1.5 mb-6">
                    <Link
                        href="/lista-precios"
                        onClick={onClose}
                        className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/lista-precios"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                            : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                    >
                        <Tags className={`w-5 h-5 transition-transform duration-300 ${pathname === "/lista-precios"
                            ? "text-indigo-500 group-hover:scale-110"
                            : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                            }`} />
                        Lista de Precios
                    </Link>

                    <Link
                        href="/disponibilidad"
                        onClick={onClose}
                        className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/disponibilidad"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                            : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                    >
                        <Truck className={`w-5 h-5 transition-transform duration-300 ${pathname === "/disponibilidad"
                            ? "text-indigo-500 group-hover:scale-110"
                            : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                            }`} />
                        Disponibilidad
                    </Link>

                    <Link
                        href="/caja"
                        onClick={onClose}
                        className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all border ${pathname === "/caja"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-500/20"
                            : "text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
                            }`}
                    >
                        <Wallet className={`w-5 h-5 transition-transform duration-300 ${pathname === "/caja"
                            ? "text-indigo-500 group-hover:scale-110"
                            : "text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110"
                            }`} />
                        Caja Unificada
                    </Link>
                </div>

                {filteredSections.map((section, idx) => (
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
                ))}
            </nav>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                        F
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">facundo</p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Administrador
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}
