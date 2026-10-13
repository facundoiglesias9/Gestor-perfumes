"use client";

import { useImperativeHandle, useRef, type InputHTMLAttributes, type Ref } from "react";
import { Search, X } from "lucide-react";

// Buscador común a todo el sistema: cuadradito verde con la lupa a la izquierda, campo con bordes
// bien redondeados y, al escribir, un brillo suave en el borde y una línea que se dibuja debajo del texto.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size"> & {
    valor: string;
    onCambiar: (valor: string) => void;
    /** "md": 44 px de alto (filtros y ventanas); "lg": 48 px (buscador principal de una página) */
    alto?: "md" | "lg";
    /** "crema" cuando va dentro de una tarjeta blanca, así se distingue del fondo */
    fondo?: "blanco" | "crema";
    /** Clases del contenedor (ancho, márgenes) */
    className?: string;
    ref?: Ref<HTMLInputElement>;
};

const ALTOS = {
    md: { caja: "h-11", cuadro: "w-[34px] h-[34px] rounded-[11px]", lupa: "w-4 h-4", linea: "left-[48px]" },
    lg: { caja: "h-12", cuadro: "w-[38px] h-[38px] rounded-[13px]", lupa: "w-[18px] h-[18px]", linea: "left-[52px]" },
} as const;

const FONDOS = {
    blanco: "bg-white dark:bg-[#171A16]",
    crema: "bg-[#F9F6F0] dark:bg-[#171A16]",
} as const;

export default function Buscador({ valor, onCambiar, alto = "md", fondo = "blanco", className = "", placeholder = "Buscar…", ref, onKeyDown, ...resto }: Props) {
    const campo = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => campo.current as HTMLInputElement);
    const a = ALTOS[alto];

    return (
        <div
            className={`group/buscador relative flex items-center gap-2.5 ${a.caja} pl-[5px] pr-1.5 rounded-[18px] border border-[#E6DFD5] dark:border-[#30362F] ${FONDOS[fondo]} shadow-[0_6px_20px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)] focus-within:border-[#7D9878]/60 focus-within:shadow-[0_0_0_4px_rgba(125,152,120,0.12),0_10px_28px_-14px_rgba(0,0,0,0.3)] transition-[border-color,box-shadow] duration-[400ms] ease-out ${className}`}
        >
            <span
                aria-hidden
                className={`${a.cuadro} shrink-0 flex items-center justify-center bg-[#7D9878] text-white group-focus-within/buscador:shadow-[0_0_18px_rgba(125,152,120,0.6)] group-focus-within/buscador:bg-[#6B8566] transition-[box-shadow,background-color] duration-[400ms] ease-out`}
            >
                <Search className={a.lupa} strokeWidth={2.4} />
            </span>

            <input
                ref={campo}
                type="search"
                value={valor}
                onChange={e => onCambiar(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Escape" && valor) { e.stopPropagation(); onCambiar(""); }
                    onKeyDown?.(e);
                }}
                placeholder={placeholder}
                aria-label={resto["aria-label"] ?? placeholder}
                {...resto}
                className="peer flex-1 min-w-0 h-full bg-transparent text-base sm:text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F4EFEA]/35 placeholder:font-normal outline-none [&::-webkit-search-cancel-button]:hidden"
            />

            {/* Línea que se dibuja debajo del texto al escribir */}
            <span
                aria-hidden
                className={`pointer-events-none absolute ${a.linea} right-10 bottom-[6px] h-[2px] rounded-full bg-gradient-to-r from-[#7D9878] via-[#A3B69B]/70 to-transparent origin-left scale-x-0 group-focus-within/buscador:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
            />

            {valor && (
                <button
                    type="button"
                    onClick={() => { onCambiar(""); campo.current?.focus(); }}
                    aria-label="Borrar búsqueda"
                    title="Borrar búsqueda"
                    className="shrink-0 w-8 h-8 rounded-[10px] flex items-center justify-center text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/[0.08] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
