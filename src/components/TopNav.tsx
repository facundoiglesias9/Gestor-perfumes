"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Tags, Wallet, ChevronDown, Layers, Plus, ShoppingCart, Archive,
    FlaskConical, ListTree, Percent, Terminal, StickyNote, Menu, X,
    LogOut, Store, Boxes, Settings2, PieChart, Users, UserRound, LayoutGrid, type LucideIcon
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppContext } from "@/context/AppContext";
import { puedeVer } from "@/lib/permisos";

type NavItem = { href: string; label: string; icon: LucideIcon; desc?: string };

// Curvas de la casa: salida rápida para lo que aparece, resorte corto para lo que se desliza.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const RESORTE = { type: "spring", bounce: 0.15, duration: 0.35 } as const;

// Pastilla que marca la sección actual: se desliza de un botón al otro al navegar.
function Pastilla() {
    return (
        <motion.span
            layoutId="nav-pastilla"
            transition={RESORTE}
            className="absolute inset-0 rounded-xl bg-white dark:bg-[#353B33] shadow-sm shadow-[#2C2C2C]/[0.06] ring-1 ring-[#E6DFD5]/80 dark:ring-white/[0.04]"
        />
    );
}

export default function TopNav() {
    const pathname = usePathname();
    const { usdRate, usdLastUpdate, orders, currentUser, logout } = useAppContext();
    const pendingOrdersCount = orders ? orders.filter(o => o.status === "solicitud recibida" || o.status === "en preparacion").length : 0;
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar menús al hacer clic afuera o con Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpenDropdown(null);
                setIsMobileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const role = currentUser?.role;

    const allDirectItems: NavItem[] = [
        { href: "/resumen", label: "Resumen", icon: PieChart },
        { href: "/lista-precios", label: "Precios", icon: Tags },
        { href: "/mi-catalogo", label: "Catálogo", icon: LayoutGrid },
        { href: "/caja", label: "Caja", icon: Wallet },
        { href: "/notas", label: "Notas", icon: StickyNote },
    ];

    const allMenuSections: { title: string; key: string; icon: LucideIcon; items: NavItem[] }[] = [
        {
            title: "Comercial",
            key: "comercial",
            icon: Store,
            items: [
                { href: "/bases", label: "Bases de Productos", icon: Layers, desc: "Componentes y cantidades de cada tipo" },
                { href: "/crear-producto", label: "Crear Producto", icon: Plus, desc: "Armar un producto a partir de una base" },
            ]
        },
        {
            title: "Inventario",
            key: "inventario",
            icon: Boxes,
            items: [
                { href: "/inventario", label: "Inventario Físico", icon: Archive, desc: "Stock de esencias e insumos" },
                { href: "/insumos", label: "Insumos", icon: Layers, desc: "Frascos, tapas y etiquetas" },
                { href: "/esencias", label: "Esencias", icon: FlaskConical, desc: "Materia prima y sus precios" },
            ]
        },
        {
            title: "Ajustes",
            key: "configuracion",
            icon: Settings2,
            items: [
                { href: "/parametros", label: "Parámetros y Clasificación", icon: ListTree, desc: "Categorías, géneros y opciones" },
                { href: "/porcentaje-ganancia", label: "Porcentaje de Ganancia", icon: Percent, desc: "Márgenes por categoría" },
                { href: "/logs", label: "Logs del Sistema", icon: Terminal, desc: "Actividad y errores del sistema" },
                { href: "/perfil", label: "Usuarios", icon: Users, desc: "Quién puede entrar al sistema" },
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
    const itemBase = "relative flex items-center gap-2 h-9 px-2.5 2xl:px-3 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50";
    const itemActivo = "text-[#2C2C2C] dark:text-[#F4EFEA]";
    const itemInactivo = "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]";
    const botonDerecha = "flex items-center gap-2 h-9 px-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] text-[13px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150";
    const inicial = (currentUser?.username || "?").charAt(0).toUpperCase();

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1B1D1A]/80 backdrop-blur-xl border-b border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300 print:hidden">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 2xl:px-8">
                {/* En pantallas grandes: tres columnas iguales a los costados, así el menú queda en el centro real.
                    En pantallas medianas (1280 a 1535 px) todo se achica un poco y se reparte el espacio para que entre en una fila. */}
                <div className="flex 2xl:grid 2xl:grid-cols-[1fr_auto_1fr] items-center justify-between gap-4 xl:gap-3 2xl:gap-4 h-16 w-full">

                    {/* Izquierda: logo */}
                    <div className="flex items-center justify-self-start shrink-0">
                        <Link href="/lista-precios" className="flex items-center gap-3 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50">
                            <img
                                src="/logo-scenta.png"
                                alt="Scenta Logo"
                                className="h-9 w-auto object-contain dark:invert dark:brightness-200 transition-transform duration-300 ease-out group-hover:scale-105"
                            />
                            <div className="flex flex-col justify-center xl:hidden 2xl:flex">
                                <span className="text-lg font-bold font-brand tracking-[0.22em] text-[#2C2C2C] dark:text-[#F4EFEA] uppercase leading-none">
                                    Scenta
                                </span>
                                <span className="hidden min-[1600px]:block text-[8px] font-bold tracking-[0.28em] text-[#7D9878] dark:text-[#A3B69B] uppercase mt-1">
                                    Fragancias Naturales
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Centro: secciones dentro de una bandeja */}
                    <div className="hidden xl:flex justify-center min-w-0">
                        <nav
                            ref={dropdownRef}
                            aria-label="Secciones"
                            className="flex items-center gap-0.5 p-1 rounded-2xl bg-[#F4EFEA]/70 dark:bg-[#202320] border border-[#E6DFD5] dark:border-[#353B33]"
                        >
                            {directItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={`${itemBase} ${isActive ? itemActivo : itemInactivo} group`}
                                    >
                                        {isActive && <Pastilla />}
                                        <span className="relative flex items-center gap-2">
                                            <Icon className={`w-4 h-4 shrink-0 transition-colors duration-150 ${isActive ? "text-[#7D9878] dark:text-[#A3B69B]" : "group-hover:text-[#7D9878] dark:group-hover:text-[#A3B69B]"}`} />
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}

                            <span className="w-px h-5 bg-[#E6DFD5] dark:bg-[#353B33] mx-1 2xl:mx-1.5" aria-hidden />

                            {menuSections.map((section) => {
                                const isSectionActive = section.items.some(i => i.href === pathname);
                                const isOpen = openDropdown === section.key;
                                const SectionIcon = section.icon;

                                return (
                                    <div key={section.key} className="relative">
                                        <button
                                            onClick={() => setOpenDropdown(isOpen ? null : section.key)}
                                            aria-expanded={isOpen}
                                            aria-haspopup="menu"
                                            className={`${itemBase} ${isSectionActive || isOpen ? itemActivo : itemInactivo} group`}
                                        >
                                            {isSectionActive && <Pastilla />}
                                            {isOpen && !isSectionActive && (
                                                <span className="absolute inset-0 rounded-xl bg-white/70 dark:bg-[#2F332E]" />
                                            )}
                                            <span className="relative flex items-center gap-2">
                                                <SectionIcon className={`w-4 h-4 shrink-0 transition-colors duration-150 ${isSectionActive ? "text-[#7D9878] dark:text-[#A3B69B]" : "group-hover:text-[#7D9878] dark:group-hover:text-[#A3B69B]"}`} />
                                                {section.title}
                                                <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-50 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`} />
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    role="menu"
                                                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
                                                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1, ease: "easeOut" } }}
                                                    style={{ transformOrigin: "top center" }}
                                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white dark:bg-[#242723] rounded-2xl p-1.5 border border-[#E6DFD5] dark:border-[#353B33] shadow-xl shadow-[#2C2C2C]/10 dark:shadow-black/40 z-50"
                                                >
                                                    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">
                                                        {section.title}
                                                    </p>
                                                    {section.items.map((item) => {
                                                        const isActive = pathname === item.href;
                                                        const Icon = item.icon;
                                                        return (
                                                            <Link
                                                                key={item.href}
                                                                href={item.href}
                                                                role="menuitem"
                                                                aria-current={isActive ? "page" : undefined}
                                                                className={`group/item flex items-center gap-3 px-2 py-2 rounded-xl transition-colors duration-150 ${isActive
                                                                    ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15"
                                                                    : "hover:bg-[#F9F6F0] dark:hover:bg-[#2F332E]"}`}
                                                            >
                                                                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 ${isActive
                                                                    ? "bg-[#7D9878] text-white"
                                                                    : "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] group-hover/item:bg-white dark:group-hover/item:bg-[#1B1D1A]"}`}>
                                                                    <Icon className="w-4 h-4" />
                                                                </span>
                                                                <span className="min-w-0">
                                                                    <span className="block text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{item.label}</span>
                                                                    {item.desc && (
                                                                        <span className="block text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 truncate">{item.desc}</span>
                                                                    )}
                                                                </span>
                                                            </Link>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Derecha: pedidos, dólar, tema y usuario */}
                    <div className="hidden xl:flex items-center justify-self-end gap-2 shrink-0">
                        {showPedidos && (
                            <Link
                                href="/pedidos"
                                title="Pedidos a proveedores"
                                aria-current={pathname === "/pedidos" ? "page" : undefined}
                                className={pathname === "/pedidos"
                                    ? "flex items-center gap-2 h-9 px-3 rounded-xl bg-[#7D9878] text-white text-[13px] font-semibold whitespace-nowrap shadow-sm shadow-[#7D9878]/30 active:scale-[0.97] transition-transform duration-150"
                                    : `${botonDerecha} text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:border-[#7D9878]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] active:scale-[0.97]`}
                            >
                                <span className="relative flex">
                                    <ShoppingCart className="w-4 h-4" />
                                    {pendingOrdersCount > 0 && (
                                        <span key={pendingOrdersCount} className="anim-pop absolute -top-2 -right-2 bg-[#C9866F] text-white font-black text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#242723]">
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
                            <span className="hidden 2xl:inline text-[11px] font-bold uppercase tracking-wider text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">Dólar</span>
                            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400"><span className="2xl:hidden">US</span>${usdRate?.toLocaleString("es-AR") || "---"}</span>
                        </div>

                        <ThemeToggle />

                        {currentUser && (
                            <div className={`flex items-center h-9 pl-1 pr-1 rounded-xl border bg-white dark:bg-[#242723] transition-colors duration-150 ${pathname === "/perfil" ? "border-[#7D9878]/60" : "border-[#E6DFD5] dark:border-[#353B33]"}`}>
                                {/* Avatar y nombre llevan a Mi perfil (cuenta y usuarios del equipo) */}
                                <Link
                                    href="/perfil"
                                    title={`Mi perfil · ${currentUser.username}`}
                                    aria-current={pathname === "/perfil" ? "page" : undefined}
                                    className="flex items-center rounded-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 active:scale-[0.97] transition-transform duration-150"
                                >
                                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8FA888] to-[#6B8566] text-white text-xs font-black flex items-center justify-center transition-[filter] duration-150 group-hover:brightness-110">
                                        {inicial}
                                    </span>
                                    <span className="hidden min-[1800px]:inline px-2 text-[13px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] capitalize group-hover:text-[#5A7356] dark:group-hover:text-[#A3B69B] transition-colors duration-150">
                                        {currentUser.username}
                                    </span>
                                </Link>
                                <button
                                    onClick={async () => {
                                        await logout();
                                        window.location.href = "/login";
                                    }}
                                    className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-rose-500 hover:bg-rose-500/10 transition-colors duration-150 active:scale-[0.94]"
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
                            className="w-10 h-10 flex items-center justify-center text-[#2C2C2C] dark:text-[#F4EFEA] bg-[#F9F6F0] dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl active:scale-[0.95] transition-transform duration-150"
                            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                            aria-expanded={isMobileMenuOpen}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                    key={isMobileMenuOpen ? "x" : "menu"}
                                    initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                                    transition={{ duration: 0.15, ease: EASE_OUT }}
                                    className="flex"
                                >
                                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE MENU OVERLAY */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: "easeOut" } }}
                        className="xl:hidden border-t border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] p-6 space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto"
                    >
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
                                <Link
                                    href="/perfil"
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] border border-[#E6DFD5] dark:border-[#353B33]"
                                >
                                    <UserRound className="w-4 h-4" />
                                    Mi perfil
                                </Link>
                            )}
                            {currentUser && (
                                <button
                                    onClick={async () => {
                                        await logout();
                                        window.location.href = "/login";
                                    }}
                                    className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-500 border border-rose-500/20"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Salir ({currentUser.username})
                                </button>
                            )}
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 uppercase tracking-widest px-3 pb-1">Principal</p>
                            {directItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                                        pathname === item.href
                                            ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B]"
                                            : "text-[#2C2C2C] dark:text-[#F4EFEA]/80 hover:bg-[#F9F6F0] dark:hover:bg-[#2F332E]"
                                    }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {menuSections.map((section) => (
                            <div key={section.key} className="space-y-1">
                                <p className="text-[10px] font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 uppercase tracking-widest px-3 pb-1">{section.title}</p>
                                {section.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                                            pathname === item.href
                                                ? "bg-[#7D9878]/10 dark:bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B]"
                                                : "text-[#2C2C2C] dark:text-[#F4EFEA]/80 hover:bg-[#F9F6F0] dark:hover:bg-[#2F332E]"
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
