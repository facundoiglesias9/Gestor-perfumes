import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Botones para la zona de acciones del encabezado (todos del mismo alto)
export const BOTON_ENC = "inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-sm shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-[background-color,transform] duration-150 whitespace-nowrap";
export const BOTON_ENC_BORDE = "inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#7D9878]/50 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-[border-color,color,transform] duration-150 whitespace-nowrap";
export const BOTON_ENC_PELIGRO = "inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold text-[#c4501f] dark:text-[#f2895c] hover:bg-[#eb6834]/10 active:scale-[0.97] transition-[background-color,transform] duration-150 whitespace-nowrap";

// Encabezado común de todas las pantallas del sistema: compacto, con el ícono de la sección,
// el título, una línea que explica para qué sirve y, a la derecha, las acciones o números clave.
export default function EncabezadoPagina({ icono: Icono, titulo, descripcion, children, className = "" }: {
    icono: LucideIcon;
    titulo: ReactNode;
    descripcion?: ReactNode;
    /** Botones o datos que van a la derecha (abajo en pantallas chicas) */
    children?: ReactNode;
    className?: string;
}) {
    return (
        <header className={`anim-entrada bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm p-5 md:p-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-5 ${className}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]">
                    <Icono className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-[28px] font-bold tracking-tight leading-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">{titulo}</h1>
                    {descripcion && <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{descripcion}</p>}
                </div>
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </header>
    );
}
