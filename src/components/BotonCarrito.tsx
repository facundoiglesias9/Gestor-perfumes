"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { Check, ShoppingCart } from "lucide-react";

// Botón "Agregar" con un carrito que viaja: va al centro, le cae un frasquito, sale por la
// derecha y vuelve entrando por la izquierda. La animación está en globals.css (.carrito-viaje);
// acá se miden las distancias y se avisa cuándo sumar al pedido.
//
// onAgregar se llama cuando el carrito sale del botón (así el contador salta en ese momento).
// Si se vuelve a tocar mientras viaja, se suma enseguida sin reiniciar la animación.
// onInicio / onFin sirven para mantener el botón a la vista mientras viaja
// (por ejemplo, en el catálogo, que después del primero muestra el − / +).

const DURACION = 1200;
const MOMENTO_AGREGADO = 0.72; // el carrito ya salió por la derecha

// Frasquito dentro de la canasta del carrito (el ícono mide 16 px)
const FRASCO = { ancho: 6, alto: 8, izquierda: 5.8, arriba: 2.7 };

const VARIANTES = {
    // Lista de precios del sistema
    salvia: {
        boton: "h-9 min-w-[112px] px-3.5 rounded-lg text-xs bg-[#7D9878] text-white shadow-sm shadow-[#7D9878]/25",
        hover: "hover:bg-[#6B8566]",
        afuera: "text-[#7D9878]",
    },
    // Catálogo público
    tinta: {
        boton: "h-10 min-w-[118px] px-4 rounded-full text-sm bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A]",
        hover: "hover:bg-[#7D9878] dark:hover:bg-[#A3B69B]",
        afuera: "text-[#2C2C2C] dark:text-[#F4EFEA]",
    },
} as const;

function Frasco({ className, style, ref }: { className: string; style?: CSSProperties; ref?: Ref<SVGSVGElement> }) {
    return (
        <svg ref={ref} viewBox="0 0 10 13" fill="currentColor" aria-hidden className={className} style={style}>
            <rect x="3.25" y="0" width="3.5" height="2.6" rx="0.6" />
            <rect x="4.1" y="2.2" width="1.8" height="1.6" />
            <rect x="0.8" y="3.4" width="8.4" height="9.6" rx="2.2" />
        </svg>
    );
}

export default function BotonCarrito({ onAgregar, onInicio, onFin, variante = "salvia", disabled, "aria-label": etiqueta, children = "Agregar" }: {
    onAgregar: () => void;
    onInicio?: () => void;
    onFin?: () => void;
    variante?: keyof typeof VARIANTES;
    disabled?: boolean;
    "aria-label"?: string;
    children?: ReactNode;
}) {
    const estilo = VARIANTES[variante];
    const boton = useRef<HTMLButtonElement>(null);
    const auto = useRef<HTMLSpanElement>(null);
    const frascoDentro = useRef<SVGSVGElement>(null);
    const frascoFuera = useRef<SVGSVGElement>(null);
    const [fase, setFase] = useState<"reposo" | "viaje" | "tilde">("reposo");

    // Siempre la versión más nueva de las funciones (el aviso llega con un retraso)
    const avisos = useRef({ onAgregar, onFin });
    useEffect(() => { avisos.current = { onAgregar, onFin }; });

    const pendiente = useRef(false);
    const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
    const respaldo = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Si el botón desaparece antes de tiempo, el producto igual se suma
    useEffect(() => () => {
        if (temporizador.current) clearTimeout(temporizador.current);
        if (respaldo.current) clearTimeout(respaldo.current);
        if (pendiente.current) avisos.current.onAgregar();
    }, []);

    const terminar = () => {
        if (respaldo.current) clearTimeout(respaldo.current);
        respaldo.current = null;
        setFase("reposo");
        avisos.current.onFin?.();
    };

    const medir = () => {
        const b = boton.current, c = auto.current, dentro = frascoDentro.current, fuera = frascoFuera.current;
        if (!b || !c || !dentro || !fuera) return;
        const ancho = b.offsetWidth, izq = c.offsetLeft, lado = c.offsetWidth, arriba = c.offsetTop;
        c.style.setProperty("--al-centro", `${(ancho - lado) / 2 - izq}px`);
        c.style.setProperty("--a-la-salida", `${ancho - izq + 2}px`);
        c.style.setProperty("--desde-izquierda", `${-(izq + lado + 2)}px`);
        // El frasco arranca un poco por encima del botón
        const caida = `${-(arriba + FRASCO.arriba + FRASCO.alto + 10)}px`;
        dentro.style.setProperty("--caida", caida);
        fuera.style.setProperty("--caida", caida);
        fuera.style.left = `${(ancho - lado) / 2 + FRASCO.izquierda}px`;
        fuera.style.top = `${arriba + FRASCO.arriba}px`;
    };

    const tocar = () => {
        if (fase !== "reposo") {
            avisos.current.onAgregar();
            return;
        }
        onInicio?.();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            avisos.current.onAgregar();
            setFase("tilde");
            respaldo.current = setTimeout(terminar, 900);
            return;
        }
        medir();
        setFase("viaje");
        pendiente.current = true;
        temporizador.current = setTimeout(() => {
            pendiente.current = false;
            avisos.current.onAgregar();
        }, DURACION * MOMENTO_AGREGADO);
        // Por si el aviso de "terminó la animación" no llega (pestaña en segundo plano, etc.)
        respaldo.current = setTimeout(terminar, DURACION + 400);
    };

    const terminoViaje = (e: React.AnimationEvent) => {
        if (e.animationName === "carrito-auto" && respaldo.current) terminar();
    };

    const viajando = fase === "viaje";

    return (
        <span className={`relative inline-flex ${viajando ? "carrito-viaje" : ""}`}>
            {/* Frasquito por fuera, detrás del botón: se ve solo mientras cae por encima */}
            <Frasco ref={frascoFuera} className={`carrito-frasco-fuera pointer-events-none absolute w-[6px] h-[8px] ${estilo.afuera}`} />
            <button
                ref={boton}
                type="button"
                onClick={tocar}
                disabled={disabled}
                aria-label={etiqueta}
                className={`relative z-[1] overflow-hidden inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none transition-[background-color,transform] duration-150 ${estilo.boton} ${fase === "reposo" ? estilo.hover : ""}`}
            >
                <span ref={auto} onAnimationEnd={terminoViaje} className="carrito-auto relative inline-flex w-4 h-4 shrink-0">
                    <span className="carrito-icono relative inline-flex w-4 h-4">
                        <Frasco ref={frascoDentro} className="carrito-frasco absolute w-[6px] h-[8px]" style={{ left: FRASCO.izquierda, top: FRASCO.arriba }} />
                        {fase === "tilde"
                            ? <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden />
                            : <ShoppingCart className="w-4 h-4" strokeWidth={2.25} aria-hidden />}
                    </span>
                </span>
                <span className="carrito-texto">{fase === "tilde" ? "Agregado" : children}</span>
            </button>
            <span className="sr-only" aria-live="polite">{fase !== "reposo" ? "Agregado al pedido" : ""}</span>
        </span>
    );
}
