"use client";

import { useId } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Easing } from "framer-motion";
import { Check, LoaderCircle } from "lucide-react";

export type EstadoBotonLiquido = "reposo" | "cargando" | "listo" | "error";

// Botón de "metal líquido". Cuando la acción sale bien, las dos mitades del botón se separan,
// el cuello que las une se estira y se corta como un líquido (soltando unas gotitas) y se vuelven
// a juntar mostrando el resultado. El efecto lo hace un filtro SVG "goo": desenfoca las formas y
// después recorta el borde, así las que están cerca se funden entre sí.
//
// Va dentro de un <form>: es el botón de enviar.

const METAL = "linear-gradient(180deg, #FFFFFF 0%, #EFF5F0 34%, #CFDED4 64%, #F4F8F5 100%)";
const BRILLO_INTERNO = "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -6px 12px rgba(120,150,130,0.25)";

// Separarse rápido, quedarse un instante y volver con rebote (llega un poco más allá y se acomoda)
const CURVAS: Easing[] = [[0.22, 1, 0.36, 1], "linear", [0.34, 1.56, 0.64, 1]];

export default function BotonLiquido({ estado, textos, tipo = "submit", onClick, controla, expandido }: {
    estado: EstadoBotonLiquido;
    textos: { reposo: string; cargando: string; listo: string };
    /** "button" cuando el botón abre algo en vez de enviar el formulario */
    tipo?: "submit" | "button";
    onClick?: () => void;
    /** id de lo que abre el botón (para lectores de pantalla) */
    controla?: string;
    expandido?: boolean;
}) {
    const filtro = `goo-${useId().replace(/[^\w-]/g, "")}`;
    const listo = estado === "listo";
    const ocupado = estado === "cargando" || listo;

    const separar = (lado: 1 | -1): TargetAndTransition => listo
        ? {
            x: [0, 38 * lado, 38 * lado, 0],
            transition: { duration: 1.05, times: [0, 0.32, 0.46, 1], ease: CURVAS },
        }
        : { x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } };

    const texto = estado === "cargando" ? textos.cargando : listo ? textos.listo : textos.reposo;

    return (
        <div className="relative">
            <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
                <defs>
                    <filter id={filtro} x="-30%" y="-120%" width="160%" height="340%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="desenfoque" />
                        <feColorMatrix in="desenfoque" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* Sombra suave debajo, como si flotara */}
            <span aria-hidden className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-3/4 h-6 rounded-full bg-black/60 blur-xl pointer-events-none" />

            <motion.button
                type={tipo}
                onClick={onClick}
                disabled={ocupado}
                aria-busy={estado === "cargando"}
                aria-controls={controla}
                aria-expanded={expandido}
                animate={estado === "error" ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                whileTap={ocupado ? undefined : { scale: 0.97 }}
                className={`group relative w-full h-14 rounded-full select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3B69B]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#1B1E1A] ${estado === "cargando" ? "cursor-wait" : listo ? "cursor-default" : "cursor-pointer"}`}
            >
                {/* Capa líquida: dos mitades que se solapan en el medio y, al separarse, forman el "cuello" */}
                <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ filter: `url(#${filtro})` }}>
                    {/* Sin sombra propia: con el mismo degradé vertical, donde se solapan no queda marca */}
                    <motion.span
                        className="absolute inset-y-0 left-0 w-[56%] rounded-full"
                        style={{ background: METAL }}
                        animate={separar(-1)}
                    />
                    <motion.span
                        className="absolute inset-y-0 right-0 w-[56%] rounded-full"
                        style={{ background: METAL }}
                        animate={separar(1)}
                    />
                    {/* Gotitas que se sueltan cuando el cuello se corta (si fueran más chicas, el filtro las borraría) */}
                    {listo && [-1, 0, 1].map(lado => (
                        <motion.span
                            key={lado}
                            className="absolute left-1/2 top-1/2 w-5 h-5 -ml-2.5 -mt-2.5 rounded-full"
                            style={{ background: METAL }}
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                            animate={{ x: lado * 16, y: [0, 20 + Math.abs(lado) * 6, 44], scale: [1, 0.85, 0.45], opacity: [1, 1, 0] }}
                            transition={{ delay: 0.26 + Math.abs(lado) * 0.05, duration: 0.7, ease: [0.4, 0, 0.6, 1] }}
                        />
                    ))}
                </span>

                {/* Relieve del metal (brillo arriba, sombra abajo): se apaga mientras el botón se parte */}
                <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ boxShadow: BRILLO_INTERNO }}
                    animate={listo ? { opacity: [1, 0, 0, 1] } : { opacity: 1 }}
                    transition={listo ? { duration: 1.05, times: [0, 0.1, 0.85, 1] } : { duration: 0.2 }}
                />

                {/* Reflejo que cruza el botón al pasar el mouse */}
                {!ocupado && (
                    <span aria-hidden className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                        <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-[-20deg] -translate-x-full group-hover:translate-x-[420%] transition-transform duration-700 ease-out" />
                    </span>
                )}

                {/* Texto (fuera del filtro, así se ve nítido) */}
                <span className="relative z-10 flex items-center justify-center h-full text-[15px] font-semibold text-[#1B1E1A]">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={listo ? "listo" : estado === "cargando" ? "cargando" : `reposo-${textos.reposo}`}
                            className="inline-flex items-center gap-2"
                            initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.2, delay: listo ? 0.62 : 0 } }}
                            exit={{ opacity: 0, y: -6, filter: "blur(3px)", transition: { duration: 0.14 } }}
                        >
                            {estado === "cargando" && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden />}
                            {listo && <Check className="w-4 h-4 text-[#4F684B]" strokeWidth={3} aria-hidden />}
                            {texto}
                        </motion.span>
                    </AnimatePresence>
                </span>
            </motion.button>
        </div>
    );
}
