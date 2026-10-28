"use client";

import { Check, Minus } from "lucide-react";

// Casilla de selección con el estilo del sistema (en vez de la del navegador): cuadrado redondeado,
// verde salvia al marcarla, con el tilde que aparece con un pequeño "pop". "mixta" = algunos sí y
// otros no (por ejemplo, la casilla de "elegir toda la página" cuando hay solo algunos elegidos).
export default function Casilla({ marcada, mixta = false, onCambiar, etiqueta, className = "" }: {
    marcada: boolean;
    mixta?: boolean;
    onCambiar: () => void;
    etiqueta: string;
    className?: string;
}) {
    const llena = marcada || mixta;
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={mixta ? "mixed" : marcada}
            aria-label={etiqueta}
            title={etiqueta}
            onClick={onCambiar}
            className={`group/casilla relative inline-flex items-center justify-center w-[18px] h-[18px] rounded-[6px] border cursor-pointer active:scale-[0.9] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#242723] ${llena
                ? "bg-[#7D9878] border-[#7D9878] text-white shadow-[0_2px_6px_-1px_rgba(125,152,120,0.55)]"
                : "bg-white/60 dark:bg-white/[0.04] border-[#2C2C2C]/25 dark:border-white/25 [@media(hover:hover)]:hover:border-[#7D9878] dark:[@media(hover:hover)]:hover:border-[#A3B69B]"} ${className}`}
        >
            {/* Área de toque más grande que el dibujo, así es fácil acertarle */}
            <span aria-hidden className="absolute -inset-2.5" />
            {mixta ? (
                <Minus className="w-3 h-3" strokeWidth={3.5} />
            ) : (
                <Check
                    className={`w-3 h-3 transition-[opacity,transform] duration-150 ease-out ${marcada ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
                    strokeWidth={3.5}
                />
            )}
        </button>
    );
}
