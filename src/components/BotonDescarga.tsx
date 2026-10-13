"use client";

import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";

export type EstadoDescarga = "reposo" | "descargando" | "listo" | "error";

// Botón redondo de descarga. Una sola línea cambia de forma según el momento:
// flecha (para descargar) → onda que se mueve (armando el archivo, con el anillo llenándose
// según el avance real) → tilde (listo) o línea quieta (no se pudo).
// Todas las formas tienen los mismos puntos, así una se transforma en la otra sin cortes.

const FLECHA = "M -8 2 Q -4 6 0 10 Q 4 6 8 2";
const ONDA_A = "M -12 0 Q -6 -6 0 0 Q 6 6 12 0";
const ONDA_B = "M -12 0 Q -6 6 0 0 Q 6 -6 12 0";
const TILDE = "M -9 0 Q -6 3.5 -3 7 Q 3.5 0 10 -7";
const PLANA = "M -10 0 Q -5 0 0 0 Q 5 0 10 0";

const FORMATOS = {
    excel: { nombre: "Excel", fondo: "#1D7044", brillo: "rgba(29,112,68,0.45)", titulo: "text-[#1D7044] dark:text-[#4CC38A]" },
    pdf: { nombre: "PDF", fondo: "#C8372D", brillo: "rgba(200,55,45,0.45)", titulo: "text-[#C8372D] dark:text-[#F0786C]" },
} as const;
const FONDO_ERROR = "#8A5446";

const RESORTE = { type: "spring", stiffness: 260, damping: 22 } as const;

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

    // El anillo y el número siguen el avance con suavidad (el avance real llega a saltos)
    const avance = useSpring(0, { stiffness: 90, damping: 20 });
    useEffect(() => {
        avance.set(estado === "listo" ? 1 : estado === "reposo" ? 0 : progreso);
    }, [avance, estado, progreso]);
    const porcentaje = useTransform(avance, v => `${Math.round(v * 100)}%`);

    const descargando = estado === "descargando";
    const linea = estado === "listo" ? TILDE : estado === "error" ? PLANA : descargando ? ONDA_A : FLECHA;
    const subtitulo = descargando ? "Armando…" : estado === "listo" ? "Descargado" : estado === "error" ? "No se pudo" : "Descargar";

    return (
        <div className="flex flex-col items-center gap-2 w-20">
            <motion.button
                type="button"
                onClick={onClick}
                disabled={deshabilitado || descargando}
                aria-label={`Descargar la lista en ${f.nombre}`}
                aria-busy={descargando}
                animate={{
                    backgroundColor: estado === "error" ? FONDO_ERROR : f.fondo,
                    scale: estado === "listo" ? [1, 1.08, 1] : 1,
                }}
                transition={{ backgroundColor: { duration: 0.3 }, scale: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } }}
                whileHover={estado === "reposo" && !deshabilitado ? { y: -2 } : undefined}
                whileTap={estado === "reposo" && !deshabilitado ? { scale: 0.94 } : undefined}
                style={{ boxShadow: `0 10px 26px -8px ${f.brillo}` }}
                className="group relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-default disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7D9878]/60 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#242723]"
            >
                <svg viewBox="-28 -28 56 56" className="w-full h-full" aria-hidden>
                    {/* Borde: en reposo es un aro suave; mientras arma el archivo se llena según el avance */}
                    <circle r="23" fill="none" stroke="white" strokeOpacity={descargando || estado === "error" ? 0.22 : 0.45} strokeWidth="2.5" />
                    <motion.circle
                        r="23"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        transform="rotate(-90)"
                        style={{ pathLength: avance }}
                        animate={{ opacity: estado === "reposo" ? 0 : estado === "error" ? 0.55 : 1 }}
                    />

                    <motion.g animate={{ y: descargando ? -3 : 0 }} transition={RESORTE}>
                        <g className="transition-transform duration-200 group-hover:translate-y-[1.5px] group-disabled:translate-y-0">
                            {/* Palito de la flecha: solo en reposo */}
                            <motion.path
                                d="M 0 -11 L 0 9"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                initial={false}
                                animate={{ pathLength: estado === "reposo" ? 1 : 0, opacity: estado === "reposo" ? 1 : 0 }}
                                transition={{ duration: 0.25 }}
                            />
                            <motion.path
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={false}
                                animate={descargando && !sinMovimiento ? { d: [ONDA_A, ONDA_B] } : { d: linea }}
                                transition={descargando && !sinMovimiento
                                    ? { duration: 0.55, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
                                    : RESORTE}
                            />
                        </g>
                    </motion.g>

                    {descargando && (
                        <motion.text
                            y="15"
                            textAnchor="middle"
                            fill="white"
                            fontSize="8"
                            fontWeight="700"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.9 }}
                            className="tabular-nums"
                        >
                            {porcentaje}
                        </motion.text>
                    )}
                </svg>
            </motion.button>

            <span className="text-center leading-tight">
                <span className={`block text-[11px] font-bold uppercase tracking-[0.14em] ${estado === "error" ? "text-[#B5654A] dark:text-[#DBA793]" : f.titulo}`}>{f.nombre}</span>
                <span className="block mt-0.5 text-[11px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50" aria-live="polite">{subtitulo}</span>
            </span>
        </div>
    );
}
