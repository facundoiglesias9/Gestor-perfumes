"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Tags, Truck, Wallet, ChevronDown, Layers, Plus, ShoppingCart, Archive,
    FlaskConical, ListTree, Percent, Terminal, StickyNote, Menu, X, Sparkles,
    ShieldCheck, LogOut
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppContext } from "@/context/AppContext";

export default function TopNav() {
    const pathname = usePathname();
    const { usdRate, usdLastUpdate, orders, currentUser, logout } = useAppContext();
    const pendingOrdersCount = orders ? orders.filter(o => o.status === "solicitud recibida" || o.status === "en preparacion").length : 0;
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const directItems = [
        { href: "/lista-precios", label: "Precios", icon: Tags },
        { href: "/disponibilidad", label: "Disponibilidad", icon: Truck },
        { href: "/caja", label: "Caja", icon: Wallet },
        { href: "/notas", label: "Notas", icon: StickyNote },
    ];

    const menuSections = [
        {
            title: "Comercial",
            key: "comercial",
            items: [
                { href: "/bases", label: "Bases de Productos", icon: Layers },
                { href: "/crear-producto", label: "Crear Producto", icon: Plus },
            ]
        },
        {
            title: "Inventario",
            key: "inventario",
            items: [
                { href: "/inventario", label: "Inventario Físico", icon: Archive },
                { href: "/insumos", label: "Insumos", icon: Layers },
                { href: "/esencias", label: "Esencias", icon: FlaskConical },
            ]
        },
        {
            title: "Ajustes",
            key: "configuracion",
            items: [
                { href: "/parametros", label: "Parámetros y Clasificación", icon: ListTree },
                { href: "/porcentaje-ganancia", label: "Porcentaje de Ganancia", icon: Percent },
                { href: "/logs", label: "Logs del Sistema", icon: Terminal },
            ]
        },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#1B1D1A]/95 backdrop-blur-xl border-b border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300 print:hidden">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-8">
                <div className="flex items-center justify-between gap-3 h-20 w-full relative">
                    
                    {/* LEFT: Brand Logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/lista-precios" className="flex items-center gap-3 group">
                            <img
                                src="/logo-scenta.png"
                                alt="Scenta Logo"
                                className="h-10 w-auto object-contain dark:invert dark:brightness-200 transition-all duration-300 group-hover:scale-105"
                            />
                            <div className="flex flex-col justify-center">
                                <span className="text-xl font-bold font-brand tracking-[0.2em] text-[#2C2C2C] dark:text-[#F4EFEA] uppercase leading-tight">
                                    Scenta
                                </span>
                                <span className="hidden min-[1800px]:block text-[8px] font-bold tracking-[0.25em] text-[#7D9878] dark:text-[#A3B69B] uppercase">
                                    Fragancias Naturales
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* CENTER: Desktop Navigation (Flex natural alignment) */}
                    <nav ref={dropdownRef} className="hidden xl:flex items-center justify-center gap-1 min-[1800px]:gap-2 flex-1 min-w-0">
                        {/* Direct Links */}
                        {directItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-2.5 min-[1800px]:px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${
                                        isActive
                                            ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 dark:border-[#A3B69B]/30 shadow-sm font-extrabold"
                                            : "text-[#2C2C2C] dark:text-[#F4EFEA]/80 hover:text-[#7D9878] dark:hover:text-[#A3B69B] hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* Dropdown Sections */}
                        {menuSections.map((section) => {
                            const isSectionActive = section.items.some(i => i.href === pathname);
                            const isOpen = openDropdown === section.key;

                            return (
                                <div key={section.key} className="relative">
                                    <button
                                        onClick={() => setOpenDropdown(isOpen ? null : section.key)}
                                        className={`flex items-center gap-1.5 px-2.5 min-[1800px]:px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 ${
                                            isSectionActive || isOpen
                                                ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B] font-extrabold"
                                                : "text-[#2C2C2C] dark:text-[#F4EFEA]/80 hover:text-[#7D9878] dark:hover:text-[#A3B69B] hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10"
                                        }`}
                                    >
                                        <span>{section.title}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-60 bg-white dark:bg-[#242723] rounded-2xl p-2.5 border border-[#E6DFD5] dark:border-[#353B33] shadow-2xl dark:shadow-black/50 animate-in fade-in duration-200 z-50">
                                            {section.items.map((item) => {
                                                const isActive = pathname === item.href;
                                                const Icon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                                                            isActive
                                                                ? "bg-[#7D9878]/15 dark:bg-[#A3B69B]/20 text-[#7D9878] dark:text-[#A3B69B] font-extrabold"
                                                                : "text-[#2C2C2C] dark:text-[#F4EFEA]/80 hover:bg-[#F9F6F0] dark:hover:bg-[#2F332E] hover:text-[#2C2C2C] dark:hover:text-white"
                                                        }`}
                                                    >
                                                        <Icon className="w-4.5 h-4.5 shrink-0" />
                                                        <span>{item.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* RIGHT: Carrito Pedidos, Rate Badge, Theme */}
                    <div className="hidden xl:flex items-center justify-end gap-2 min-[1800px]:gap-3 shrink-0">
                        {/* Shopping Cart / Pedidos Mayoristas Button */}
                        <Link
                            href="/pedidos"
                            className={`flex items-center gap-2.5 px-3 min-[1800px]:px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all relative ${
                                pathname === "/pedidos"
                                    ? "bg-[#7D9878] text-white shadow-lg shadow-[#7D9878]/30 scale-[1.03]"
                                    : "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B] hover:bg-[#7D9878]/20 dark:hover:bg-[#A3B69B]/25 border border-[#7D9878]/20 dark:border-[#A3B69B]/30"
                            }`}
                            title="Pedidos Mayoristas"
                        >
                            <div className="relative flex items-center justify-center">
                                <ShoppingCart className="w-4.5 h-4.5" />
                                {pendingOrdersCount > 0 && (
                                    <span className="absolute -top-2.5 -right-2.5 bg-[#C9866F] text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                                        {pendingOrdersCount}
                                    </span>
                                )}
                            </div>
                            <span className="hidden min-[1800px]:inline font-extrabold">Pedidos</span>
                        </Link>

                        {/* USD Blue Rate Indicator */}
                        <div
                            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 min-[1800px]:px-3.5 py-2 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold whitespace-nowrap"
                            title={usdLastUpdate ? `Última actualización: ${new Date(usdLastUpdate).toLocaleString('es-AR')}` : ""}
                        >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="hidden min-[1800px]:inline">USD</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">${usdRate?.toLocaleString('es-AR') || "---"}</span>
                        </div>

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Current User Badge & Logout */}
                        {currentUser && (
                            <div className="flex items-center gap-2.5 bg-[#7D9878]/10 dark:bg-[#242723] px-3 min-[1800px]:px-3.5 py-2 rounded-xl border border-[#7D9878]/25 dark:border-[#353B33] transition-all">
                                <div className="flex items-center gap-1.5 text-[#7D9878] dark:text-[#A3B69B]">
                                    <ShieldCheck className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                                    <span className="hidden min-[1800px]:inline text-xs font-black uppercase tracking-wider">
                                        {currentUser.username}
                                    </span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-[#7D9878]/30 dark:bg-[#353B33]" />
                                <button
                                    onClick={() => {
                                        logout();
                                        window.location.href = "/login";
                                    }}
                                    className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                    title="Cerrar Sesión"
                                >
                                    <span>Salir</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* MOBILE MENU BUTTON */}
                    <div className="flex xl:hidden items-center justify-end gap-3">
                        <ThemeToggle />
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2.5 text-[#2C2C2C] dark:text-[#F4EFEA] bg-[#F9F6F0] dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl"
                            aria-label="Menú"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE MENU OVERLAY */}
            {isMobileMenuOpen && (
                <div className="xl:hidden border-t border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] p-6 space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto">
                    {/* Accesos rápidos que en escritorio están a la derecha */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/pedidos"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 dark:border-[#A3B69B]/30"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Pedidos
                            {pendingOrdersCount > 0 && (
                                <span className="bg-[#C9866F] text-white font-black text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                                    {pendingOrdersCount}
                                </span>
                            )}
                        </Link>
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            USD ${usdRate?.toLocaleString('es-AR') || "---"}
                        </div>
                        {currentUser && (
                            <button
                                onClick={() => {
                                    logout();
                                    window.location.href = "/login";
                                }}
                                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-500 border border-rose-500/20"
                            >
                                <LogOut className="w-4 h-4" />
                                Salir ({currentUser.username})
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 uppercase tracking-widest px-3">Principal</p>
                        {directItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${
                                    pathname === item.href
                                        ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B]"
                                        : "text-[#2C2C2C] dark:text-[#F4EFEA]/80"
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {menuSections.map((section) => (
                        <div key={section.key} className="space-y-2">
                            <p className="text-[10px] font-black text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 uppercase tracking-widest px-3">{section.title}</p>
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${
                                        pathname === item.href
                                            ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B]"
                                            : "text-[#2C2C2C] dark:text-[#F4EFEA]/80"
                                    }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </header>
    );
}
