"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Check, FileSpreadsheet, FileText, LoaderCircle, TriangleAlert, Download } from "lucide-react";

export type EstadoDescarga = "reposo" | "descargando" | "listo" | "error";

// Botón de descarga con el mismo alto que "Ver pedido". Mientras se arma el archivo,
// el fondo se va llenando de izquierda a derecha según el avance real; al terminar
// muestra un tilde (o un aviso si no se pudo) y vuelve solo a como estaba.

const FORMATOS = {
    excel: {
        nombre: "Excel",
        Icono: FileSpreadsheet,
        boton: "border-[#7D9878]/55 bg-[#7D9878]/[0.08] text-[#3F5A3C] dark:text-[#C5D6BF] [@media(hover:hover)]:hover:bg-[#7D9878]/[0.16] [@media(hover:hover)]:hover:border-[#7D9878]",
        relleno: "bg-[#7D9878]/25 dark:bg-[#7D9878]/35",
    },
    pdf: {
        nombre: "PDF",
        Icono: FileText,
        boton: "border-[#C9866F]/55 bg-[#C9866F]/[0.08] text-[#97604D] dark:text-[#DBA793] [@media(hover:hover)]:hover:bg-[#C9866F]/[0.16] [@media(hover:hover)]:hover:border-[#C9866F]",
        relleno: "bg-[#C9866F]/25 dark:bg-[#C9866F]/35",
    },
} as const;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export default function BotonDescarga({ formato, estado, progreso, deshabilitado, onClick }: {
    formato: keyof typeof FORMATOS;
    estado: EstadoDescarga;
    /** De 0 a 1 */
    progreso: number;
    deshabilitado?: boolean;
    onClick: () => void;
}) {
    const f = FORMATOS[formato];
    const sinMovimiento = useReducedMotion();

    // El relleno sigue el avance con suavidad (el avance real llega a saltos)
    const avance = useSpring(0, { stiffness: 120, damping: 22 });
    useEffect(() => {
        if (estado === "reposo") avance.jump(0);
        else avance.set(estado === "listo" || estado === "error" ? 1 : progreso);
    }, [avance, estado, progreso]);
    const recorte = useTransform(avance, v => `inset(0 ${100 - v * 100}% 0 0)`);
    const porcentaje = useTransform(avance, v => `${Math.round(v * 100)}%`);

    const descargando = estado === "descargando";
    const ocupado = deshabilitado || descargando;

    // Ícono y texto de cada momento
    const contenido =
        descargando ? { clave: "armando", icono: <LoaderCircle className="w-4 h-4 animate-spin" />, texto: <motion.span className="tabular-nums">{porcentaje}</motion.span> }
            : estado === "listo" ? { clave: "listo", icono: <Check className="w-4 h-4" strokeWidth={3} />, texto: "Listo" }
                : estado === "error" ? { clave: "error", icono: <TriangleAlert className="w-4 h-4" />, texto: "Error" }
                    : { clave: "reposo", icono: <f.Icono className="w-4 h-4" />, texto: f.nombre };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={ocupado}
            aria-label={`Descargar la lista en ${f.nombre}`}
            aria-busy={descargando}
            title={`Descargar en ${f.nombre}`}
            className={`group relative overflow-hidden inline-flex items-center justify-center gap-2 h-10 min-w-[104px] px-3.5 rounded-xl border text-sm font-semibold shadow-sm shadow-black/[0.03] whitespace-nowrap active:scale-[0.97] disabled:active:scale-100 disabled:cursor-default transition-[background-color,border-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${f.boton} ${deshabilitado && !descargando ? "opacity-60" : ""}`}
        >
            {/* Relleno de avance */}
            <motion.span
                aria-hidden
                className={`absolute inset-0 ${f.relleno}`}
                style={{ clipPath: recorte }}
                animate={{ opacity: estado === "reposo" ? 0 : 1 }}
                transition={{ duration: 0.2 }}
            />

            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={contenido.clave}
                    className="relative inline-flex items-center gap-2"
                    initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(2px)" }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                >
                    {contenido.icono}
                    {contenido.texto}
                    {estado === "reposo" && (
                        <Download className="w-3.5 h-3.5 opacity-50 transition-[opacity,transform] duration-150 ease-out [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:translate-y-[1px]" />
                    )}
                </motion.span>
            </AnimatePresence>

            <span className="sr-only" aria-live="polite">
                {descargando ? "Armando el archivo" : estado === "listo" ? "Descargado" : estado === "error" ? "No se pudo descargar" : ""}
            </span>
        </button>
    );
}
