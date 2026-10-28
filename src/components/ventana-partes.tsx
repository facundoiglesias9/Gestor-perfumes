"use client";

import type { ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

// Piezas del diseño común de las ventanas: marco, encabezado, contenido y pie.
// Todas las ventanas del sistema las usan, así se ven y se comportan igual:
// fondo liso, mucho aire, una sola acción principal (verde) abajo a la derecha
// y la secundaria (Cancelar / Atrás) como texto a la izquierda.
//
// <Ventana abierta onCerrar>
//   <PanelVentana ancho="md">
//     <CabeceraVentana etiqueta="Nuevo" titulo="Insumo" onCerrar={…} />
//     <CuerpoVentana>…campos…</CuerpoVentana>
//     <PieVentana><button className={BOTON_SECUNDARIO}>Cancelar</button><button className={BOTON_PRINCIPAL}>Guardar</button></PieVentana>
//   </PanelVentana>
// </Ventana>

const ANCHOS = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-5xl",
} as const;

export function PanelVentana({ ancho = "md", alto = "contenido", className = "", children, ...resto }: {
    ancho?: keyof typeof ANCHOS;
    /** "pantalla": ocupa casi todo el alto disponible (para listas largas); "contenido": lo que necesite */
    alto?: "contenido" | "pantalla";
    className?: string;
    children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
    const altura = alto === "pantalla"
        ? "h-[calc(100dvh-2rem)] sm:h-[min(56rem,calc(100dvh-3rem))]"
        : "max-h-[calc(100dvh-6rem)]";
    return (
        <div
            {...resto}
            className={`w-full ${ANCHOS[ancho]} ${altura} flex flex-col overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-2xl shadow-black/10 ${className}`}
        >
            {children}
        </div>
    );
}

// La X de todo el sistema (cerrar una ventana o quitar algo de una lista): círculo de vidrio que,
// al pasar el mouse, se tiñe de terracota y la X gira un cuarto de vuelta. "sm" para dentro de listas.
const TAMANOS_X = {
    md: { boton: "w-9 h-9", icono: "w-4 h-4" },
    sm: { boton: "w-7 h-7", icono: "w-3.5 h-3.5" },
} as const;

export function BotonCerrar({ onClick, disabled, className = "", tamano = "md", etiqueta = "Cerrar" }: {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    tamano?: keyof typeof TAMANOS_X;
    /** Lo que hace, para el lector de pantalla y el cartelito: "Cerrar", "Quitar Sauvage"… */
    etiqueta?: string;
}) {
    const t = TAMANOS_X[tamano];
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={etiqueta}
            aria-label={etiqueta}
            className={`group/x ${t.boton} rounded-full flex items-center justify-center shrink-0 cursor-pointer border border-white/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 [@media(hover:hover)]:hover:bg-[#C9866F] [@media(hover:hover)]:hover:border-[#C9866F] [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:shadow-[0_6px_18px_-4px_rgba(201,134,111,0.6)] active:scale-[0.92] disabled:opacity-40 disabled:pointer-events-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9866F]/60 ${className}`}
        >
            <X className={`${t.icono} transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover/x:rotate-90`} />
        </button>
    );
}

export function CabeceraVentana({ etiqueta, titulo, descripcion, icono: Icono, tono = "salvia", onCerrar, cerrarDeshabilitado, children }: {
    /** Texto chico arriba del título: "Nuevo insumo", "Editar", "Exportar"… */
    etiqueta?: ReactNode;
    titulo: ReactNode;
    descripcion?: ReactNode;
    icono?: LucideIcon;
    tono?: "salvia" | "terracota";
    onCerrar?: () => void;
    cerrarDeshabilitado?: boolean;
    /** Lo que va debajo del título dentro del encabezado (pasos, pestañas) */
    children?: ReactNode;
}) {
    const colorIcono = tono === "terracota"
        ? "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]"
        : "bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]";
    const colorEtiqueta = tono === "terracota" ? "text-[#97604D] dark:text-[#DBA793]" : "text-[#5A7356] dark:text-[#A3B69B]";
    return (
        <div className="px-7 pt-6 pb-5 border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 shrink-0">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                    {Icono && (
                        <span className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorIcono}`}>
                            <Icono className="w-5 h-5" />
                        </span>
                    )}
                    <div className="min-w-0">
                        {etiqueta && (
                            <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${colorEtiqueta}`}>{etiqueta}</p>
                        )}
                        <h2 className={`${etiqueta ? "mt-1" : ""} text-2xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand break-words`}>
                            {titulo}
                        </h2>
                        {descripcion && (
                            <p className="mt-1 text-sm leading-relaxed text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{descripcion}</p>
                        )}
                    </div>
                </div>
                {onCerrar && <BotonCerrar onClick={onCerrar} disabled={cerrarDeshabilitado} />}
            </div>
            {children}
        </div>
    );
}

export function CuerpoVentana({ className = "", children }: { className?: string; children: ReactNode }) {
    return (
        <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-7 py-6 ${className}`}>
            {children}
        </div>
    );
}

export function PieVentana({ className = "", children }: { className?: string; children: ReactNode }) {
    return (
        <div className={`px-7 py-4 border-t border-[#E6DFD5]/70 dark:border-[#353B33]/70 flex items-center justify-between gap-3 shrink-0 ${className}`}>
            {children}
        </div>
    );
}

/** Título chico de un grupo de campos dentro de una ventana */
export function TituloGrupo({ children, derecha }: { children: ReactNode; derecha?: ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{children}</h3>
            {derecha}
        </div>
    );
}

// Estilos de campos y botones, iguales en todas las ventanas
export const ETIQUETA_CAMPO = "block mb-1.5 text-sm font-medium text-[#2C2C2C]/80 dark:text-[#F4EFEA]/75";
export const AYUDA_CAMPO = "mt-1.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50";
export const CAMPO = "w-full h-11 px-3.5 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-sm text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/35 dark:placeholder:text-[#F4EFEA]/30 outline-none focus:border-[#7D9878]/70 focus:ring-2 focus:ring-[#7D9878]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-[border-color,box-shadow] duration-150";
export const AREA_TEXTO = CAMPO.replace("h-11", "min-h-[96px] py-3 resize-y leading-relaxed");

export const BOTON_PRINCIPAL = "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none transition-[background-color,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#242723]";
export const BOTON_PELIGRO = "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#B5654A] text-white text-sm font-semibold shadow-md shadow-[#B5654A]/25 hover:bg-[#9E5640] active:scale-[0.97] disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none transition-[background-color,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5654A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#242723]";
export const BOTON_SECUNDARIO = "inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-sm font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.05] dark:hover:bg-white/[0.07] active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50";
/** Botón con borde, para acciones de apoyo dentro del contenido */
export const BOTON_BORDE = "inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#1B1D1A] text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#7D9878]/50 active:scale-[0.97] transition-[border-color,color,transform] duration-150";

/** Opción elegible (chip) con estado elegido/no elegido */
export const opcion = (elegida: boolean) =>
    `inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-medium cursor-pointer active:scale-[0.97] transition-[border-color,background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${elegida
        ? "border-[#7D9878] bg-[#7D9878]/[0.08] dark:bg-[#7D9878]/[0.14] text-[#3F5A3C] dark:text-[#C5D6BF] shadow-[inset_0_0_0_1px_#7D9878]"
        : "border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:border-[#7D9878]/50 hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A]"}`;

/** Fila con interruptor para una opción de sí/no */
export function FilaInterruptor({ titulo, descripcion, activo, onCambiar }: {
    titulo: ReactNode;
    descripcion?: ReactNode;
    activo: boolean;
    onCambiar: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={activo}
            onClick={() => onCambiar(!activo)}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] text-left cursor-pointer hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
        >
            <span className="min-w-0">
                <span className="block text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA]">{titulo}</span>
                {descripcion && <span className="block mt-0.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{descripcion}</span>}
            </span>
            <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200 ${activo ? "bg-[#7D9878]" : "bg-[#2C2C2C]/15 dark:bg-white/15"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${activo ? "translate-x-4" : "translate-x-0"}`} />
            </span>
        </button>
    );
}

/** "Todas · Ninguna" para elegir rápido en una lista de opciones */
export function TodoNada({ onTodo, onNada }: { onTodo: () => void; onNada: () => void }) {
    const estilo = "text-xs font-semibold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] transition-colors duration-150";
    return (
        <span className="flex items-center gap-2">
            <button type="button" onClick={onTodo} className={estilo}>Todas</button>
            <span aria-hidden className="text-[#2C2C2C]/20 dark:text-[#F4EFEA]/20">·</span>
            <button type="button" onClick={onNada} className={estilo}>Ninguna</button>
        </span>
    );
}
