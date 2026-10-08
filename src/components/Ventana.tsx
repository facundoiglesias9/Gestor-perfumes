"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

// Ventana emergente común a todo el sistema: fondo que se oscurece y difumina, panel que
// aparece desde un poco más abajo y más chico, y se va rápido al cerrar. Se cierra con
// Escape o tocando afuera, bloquea el scroll de la página y devuelve el foco al cerrar.
//
// Uso: <Ventana abierta={x} onCerrar={() => setX(false)}> <div className="...panel...">…</div> </Ventana>
// El panel lo pone cada pantalla (su ancho, colores y bordes); Ventana solo lo centra y lo anima.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Ventanas abiertas, de la de abajo a la de arriba: Escape cierra solo la de arriba.
const pila: string[] = [];
let scrollAnterior = "";

const suscribir = () => () => {};

type Props = {
    abierta: boolean;
    onCerrar?: () => void;
    /** false en formularios largos o mientras algo se está procesando */
    cerrarAlTocarFondo?: boolean;
    etiqueta?: string;
    z?: number;
    children: ReactNode;
};

export default function Ventana({ abierta, ...resto }: Props) {
    // Recién en el navegador existe document.body para el portal (en el servidor no se dibuja)
    const enNavegador = useSyncExternalStore(suscribir, () => true, () => false);
    if (!enNavegador) return null;

    return createPortal(
        <MotionConfig reducedMotion="user">
            <AnimatePresence>{abierta && <Contenido key="ventana" {...resto} />}</AnimatePresence>
        </MotionConfig>,
        document.body,
    );
}

function Contenido({ onCerrar, cerrarAlTocarFondo = true, etiqueta, z = 200, children }: Omit<Props, "abierta">) {
    const id = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    // Siempre la versión más nueva de onCerrar, sin volver a armar los escuchas
    const cerrarRef = useRef(onCerrar);
    useEffect(() => { cerrarRef.current = onCerrar; }, [onCerrar]);

    useEffect(() => {
        // Bloquear el scroll de atrás (una sola vez aunque haya ventanas encimadas)
        if (pila.length === 0) {
            scrollAnterior = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        }
        pila.push(id);

        // Foco adentro de la ventana (si ningún campo lo pidió con autoFocus) y después devolverlo
        const anterior = document.activeElement as HTMLElement | null;
        const panel = panelRef.current;
        if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === "Escape" && pila[pila.length - 1] === id && cerrarRef.current) {
                e.stopPropagation();
                cerrarRef.current();
            }
        };
        document.addEventListener("keydown", alTeclear);

        return () => {
            document.removeEventListener("keydown", alTeclear);
            const i = pila.lastIndexOf(id);
            if (i >= 0) pila.splice(i, 1);
            if (pila.length === 0) document.body.style.overflow = scrollAnterior;
            if (anterior && document.contains(anterior)) anterior.focus({ preventScroll: true });
        };
    }, [id]);

    return (
        <div className="fixed inset-0 overflow-y-auto overscroll-contain" style={{ zIndex: z }}>
            <motion.div
                aria-hidden
                className="fixed inset-0 bg-[#1B1D1A]/55 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.22, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
                onClick={cerrarAlTocarFondo ? () => cerrarRef.current?.() : undefined}
            />
            {/* El área alrededor del panel deja pasar los clics al fondo (para cerrar tocando afuera) */}
            <div className="relative min-h-full flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <motion.div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={etiqueta}
                    tabIndex={-1}
                    className="ventana-panel w-full flex justify-center outline-none"
                    initial={{ opacity: 0, scale: 0.96, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
                    exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15, ease: "easeOut" } }}
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
