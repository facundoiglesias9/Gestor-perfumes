"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Store, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ListSelectorToggleProps {
    className?: string;
    activeMode?: "minorista" | "mayorista";
    onSelectMode?: (mode: "minorista" | "mayorista") => void;
}

const OPCIONES: { mode: "minorista" | "mayorista"; label: string; icon: LucideIcon; href: string }[] = [
    { mode: "minorista", label: "Minorista", icon: ShoppingBag, href: "/minorista" },
    { mode: "mayorista", label: "Mayorista", icon: Store, href: "/lista-precios" },
];

export default function ListSelectorToggle({ className = "", activeMode, onSelectMode }: ListSelectorToggleProps) {
    const pathname = usePathname();

    // Determine active mode from props or current pathname
    const isMinorista = activeMode ? activeMode === "minorista" : (pathname === "/minorista" || pathname === "/");
    const activo = isMinorista ? "minorista" : "mayorista";

    return (
        <div
            role="tablist"
            aria-label="Lista de precios"
            className={`inline-flex items-center gap-0.5 p-1 rounded-2xl bg-[#F4EFEA]/80 dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] ${className}`}
        >
            {OPCIONES.map(({ mode, label, icon: Icon, href }) => {
                const esActivo = activo === mode;
                const clases = `relative flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${esActivo
                    ? "text-[#2C2C2C] dark:text-[#F4EFEA]"
                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`;
                const contenido = (
                    <>
                        {/* La pastilla blanca se desliza hasta la lista elegida */}
                        {esActivo && (
                            <motion.span
                                layoutId="lista-pastilla"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                className="absolute inset-0 rounded-xl bg-white dark:bg-[#353B33] shadow-sm shadow-[#2C2C2C]/[0.06] ring-1 ring-[#E6DFD5]/80 dark:ring-white/[0.04]"
                            />
                        )}
                        <span className="relative flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${esActivo ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                            {label}
                        </span>
                    </>
                );

                return onSelectMode ? (
                    <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={esActivo}
                        onClick={() => onSelectMode(mode)}
                        className={clases}
                    >
                        {contenido}
                    </button>
                ) : (
                    <Link key={mode} href={href} role="tab" aria-selected={esActivo} className={clases}>
                        {contenido}
                    </Link>
                );
            })}
        </div>
    );
}
