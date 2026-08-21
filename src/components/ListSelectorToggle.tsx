"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Store, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ListSelectorToggleProps {
    className?: string;
    activeMode?: "minorista" | "mayorista";
    onSelectMode?: (mode: "minorista" | "mayorista") => void;
}

export default function ListSelectorToggle({ className = "", activeMode, onSelectMode }: ListSelectorToggleProps) {
    const pathname = usePathname();
    
    // Determine active mode from props or current pathname
    const isMinorista = activeMode ? activeMode === "minorista" : (pathname === "/minorista" || pathname === "/");
    const isMayorista = activeMode ? activeMode === "mayorista" : pathname === "/lista-mayorista";

    const handleSelect = (mode: "minorista" | "mayorista") => {
        if (onSelectMode) {
            onSelectMode(mode);
        }
    };

    return (
        <div className={`inline-flex items-center p-1.5 bg-[#F9F6F0] dark:bg-[#1B1D1A] backdrop-blur-xl border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl shadow-inner ${className}`}>
            {onSelectMode ? (
                // State-controlled button tabs
                <div className="flex items-center gap-1 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => handleSelect("minorista")}
                        className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
                            isMinorista
                                ? "text-[#7D9878] dark:text-[#A3B69B]"
                                : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        {isMinorista && (
                            <motion.div
                                layoutId="activeListPill"
                                className="absolute inset-0 bg-white dark:bg-[#242723] rounded-xl shadow-md border border-[#7D9878]/30 dark:border-[#A3B69B]/30"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <ShoppingBag className={`w-4 h-4 ${isMinorista ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                            Lista Minorista
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelect("mayorista")}
                        className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
                            isMayorista
                                ? "text-[#7D9878] dark:text-[#A3B69B]"
                                : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        {isMayorista && (
                            <motion.div
                                layoutId="activeListPill"
                                className="absolute inset-0 bg-white dark:bg-[#242723] rounded-xl shadow-md border border-[#7D9878]/30 dark:border-[#A3B69B]/30"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Store className={`w-4 h-4 ${isMayorista ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                            Lista Mayorista
                        </span>
                    </button>
                </div>
            ) : (
                // Next.js Link tabs
                <div className="flex items-center gap-1 w-full sm:w-auto">
                    <Link
                        href="/minorista"
                        className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
                            isMinorista
                                ? "text-[#7D9878] dark:text-[#A3B69B]"
                                : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        {isMinorista && (
                            <motion.div
                                layoutId="activeListPill"
                                className="absolute inset-0 bg-white dark:bg-[#242723] rounded-xl shadow-md border border-[#7D9878]/30 dark:border-[#A3B69B]/30"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <ShoppingBag className={`w-4 h-4 ${isMinorista ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                            Lista Minorista
                        </span>
                    </Link>

                    <Link
                        href="/lista-precios"
                        className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 ${
                            isMayorista
                                ? "text-[#7D9878] dark:text-[#A3B69B]"
                                : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878] dark:hover:text-[#A3B69B]"
                        }`}
                    >
                        {isMayorista && (
                            <motion.div
                                layoutId="activeListPill"
                                className="absolute inset-0 bg-white dark:bg-[#242723] rounded-xl shadow-md border border-[#7D9878]/30 dark:border-[#A3B69B]/30"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Store className={`w-4 h-4 ${isMayorista ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                            Lista Mayorista
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}
