"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Tags, Truck, Wallet, ChevronDown, Layers, Plus, ShoppingCart, Archive,
    FlaskConical, ListTree, Percent, Terminal, StickyNote, Menu, X, Sparkles,
    LogOut
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppContext } from "@/context/AppContext";
import { puedeVer } from "@/lib/permisos";

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

    const role = currentUser?.role;

    const allDirectItems = [
        { href: "/lista-precios", label: "Precios", icon: Tags },
        { href: "/disponibilidad", label: "Disponibilidad", icon: Truck },
        { href: "/caja", label: "Caja", icon: Wallet },
        { href: "/notas", label: "Notas", icon: StickyNote },
    ];

    const allMenuSections = [
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

    // Cada usuario ve solo lo que puede abrir (mismas reglas que el control de acceso del layout).
    const directItems = allDirectItems.filter(i => puedeVer(role, i.href));
    const menuSections = allMenuSections
        .map(s => ({ ...s, items: s.items.filter(i => puedeVer(role, i.href)) }))
        .filter(s => s.items.length > 0);
    const showPedidos = puedeVer(role, "/pedidos");

    // Estilos compartidos de la botonera (misma altura y peso en todos los botones).
    const itemBase = "flex items-center gap-2 h-9 px-3 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200";
    const itemActivo = "bg-white dark:bg-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm shadow-[#2C2C2C]/5";
    const itemInactivo = "text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-white/60 dark:hover:bg-[#2F332E]";
    const botonDerecha = "flex items-center gap-2 h-9 px-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] text-[13px] font-semibold whitespace-nowrap transition-colors";
    const inicial = (currentUser?.username || "?").charAt(0).toUpperCase();

    return (
        <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#1B1D1A]/85 backdrop-blur-xl border-b border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300 print:hidden">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-8">
                <div className="flex items-center justify-between gap-3 h-16 w-full relative">

                    {/* Izquierda: logo */}
                    <div className="flex items-center shrink-0">
                        <Link href="/lista-precios" className="flex items-center gap-3 group">
                            <img
                                src="/logo-scenta.png"
                                alt="Scenta Logo"
                                className="h-9 w-auto object-contain dark:invert dark:brightness-200 transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="flex flex-col justify-center">
                                <span className="text-lg font-bold font-brand tracking-[0.22em] text-[#2C2C2C] dark:text-[#F4EFEA] uppercase leading-none">
                                    Scenta
                                </span>
                                <span className="hidden min-[1800px]:block text-[8px] font-bold tracking-[0.28em] text-[#7D9878] dark:text-[#A3B69B] uppercase mt-1">
                                    Fragancias Naturales
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Centro: secciones dentro de una bandeja */}
                    <div className="hidden xl:flex flex-1 justify-center min-w-0">
                        <nav
                            ref={dropdownRef}
                            className="flex items-center gap-0.5 p-1 rounded-2xl bg-[#F4EFEA]/80 dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33]"
                        >
                            {directItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={`${itemBase} ${isActive ? itemActivo : itemInactivo}`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}

                            <span className="w-px h-5 bg-[#E6DFD5] dark:bg-[#353B33] mx-1" aria-hidden />

                            {menuSections.map((section) => {
                                const isSectionActive = section.items.some(i => i.href === pathname);
                                const isOpen = openDropdown === section.key;

                                return (
                                    <div key={section.key} className="relative">
                                        <button
                                            onClick={() => setOpenDropdown(isOpen ? null : section.key)}
                                            aria-expanded={isOpen}
                                            className={`${itemBase} ${isSectionActive || isOpen ? itemActivo : itemInactivo}`}
                                        >
                                            <span>{section.title}</span>
                                            <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        {isOpen && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white dark:bg-[#242723] rounded-2xl p-1.5 border border-[#E6DFD5] dark:border-[#353B33] shadow-xl shadow-[#2C2C2C]/10 dark:shadow-black/40 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                                                <p className="px-3 pt-2 pb-1.5 text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">
                                                    {section.title}
                                                </p>
                                                {section.items.map((item) => {
                                                    const isActive = pathname === item.href;
                                                    const Icon = item.icon;
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            aria-current={isActive ? "page" : undefined}
                                                            className={`flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium transition-colors ${isActive
                                                                ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                                : "text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:bg-[#F9F6F0] dark:hover:bg-[#2F332E] hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                                        >
                                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive
                                                                ? "bg-[#7D9878] text-white"
                                                                : "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B]"}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </span>
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
                    </div>

                    {/* Derecha: pedidos, dólar, tema y usuario */}
                    <div className="hidden xl:flex items-center justify-end gap-2 shrink-0">
                        {showPedidos && (
                            <Link
                                href="/pedidos"
                                title="Pedidos a proveedores"
                                aria-current={pathname === "/pedidos" ? "page" : undefined}
                                className={pathname === "/pedidos"
                                    ? "flex items-center gap-2 h-9 px-3 rounded-xl bg-[#7D9878] text-white text-[13px] font-semibold whitespace-nowrap shadow-sm shadow-[#7D9878]/30"
                                    : `${botonDerecha} text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:border-[#7D9878] hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]`}
                            >
                                <span className="relative flex">
                                    <ShoppingCart className="w-4 h-4" />
                                    {pendingOrdersCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-[#C9866F] text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                                            {pendingOrdersCount}
                                        </span>
                                    )}
                                </span>
                                <span className="hidden min-[1800px]:inline">Pedidos</span>
                            </Link>
                        )}

                        <div
                            className={`${botonDerecha} cursor-default`}
                            title={usdLastUpdate ? `Dólar blue · actualizado ${new Date(usdLastUpdate).toLocaleString("es-AR")}` : "Dólar blue"}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">Dólar</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">${usdRate?.toLocaleString("es-AR") || "---"}</span>
                        </div>

                        <ThemeToggle />

                        {currentUser && (
                            <div className="flex items-center h-9 pl-1 pr-1 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723]">
                                <span
                                    className="w-7 h-7 rounded-lg bg-[#7D9878] text-white text-xs font-black flex items-center justify-center"
                                    title={`${currentUser.username} · administrador`}
                                >
                                    {inicial}
                                </span>
                                <span className="hidden min-[1800px]:inline px-2 text-[13px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] capitalize">
                                    {currentUser.username}
                                </span>
                                <button
                                    onClick={() => {
                                        logout();
                                        window.location.href = "/login";
                                    }}
                                    className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    title="Cerrar sesión"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogOut className="w-4 h-4" />
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
                        {showPedidos && <Link
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
                        </Link>}
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
