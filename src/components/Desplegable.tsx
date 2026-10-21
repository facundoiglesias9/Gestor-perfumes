"use client";

import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

// Desplegable propio (en lugar del del navegador, que no se puede estilizar):
// bordes redondeados, se abre desde el botón con una animación corta y marca la opción elegida.
// La lista se dibuja encima de todo (también dentro de ventanas) y se abre hacia arriba si abajo no entra.
// Teclado: flechas para moverse, Enter o Espacio para elegir, Escape para cerrar, letras para saltar.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const ALTO_LISTA = 288; // px máximos de la lista; si hay más opciones, se desplaza

export type OpcionDesplegable<T extends string = string> = {
    valor: T;
    titulo: string;
    deshabilitada?: boolean;
    /** Texto chico a la derecha de la opción en la lista (por ejemplo, cuántos productos hay) */
    extra?: string;
};

const ALTOS = { sm: "h-9 text-sm", md: "h-10 text-sm", lg: "h-11 text-sm" } as const;
const FONDOS = {
    crema: "bg-[#F9F6F0] dark:bg-[#1B1D1A]",
    blanco: "bg-white dark:bg-[#242723]",
} as const;

export default function Desplegable<T extends string = string>({
    valor, opciones, onCambiar, etiqueta, icono, placeholder = "Elegí una opción",
    alto = "lg", fondo = "crema", required, disabled, className = "", claseBoton = "", resaltado,
}: {
    valor: T;
    opciones: OpcionDesplegable<T>[];
    onCambiar: (v: T) => void;
    /** Para lectores de pantalla: "Ordenar por", "Género"… (si falta, usa el <label> que lo rodea) */
    etiqueta?: string;
    icono?: ReactNode;
    /** Texto cuando todavía no se eligió nada (valor vacío) */
    placeholder?: string;
    alto?: keyof typeof ALTOS;
    fondo?: keyof typeof FONDOS;
    /** En formularios: no deja enviar si está vacío (con el aviso del navegador) */
    required?: boolean;
    disabled?: boolean;
    className?: string;
    /** Clases extra para el botón (texto, peso, etc.) */
    claseBoton?: string;
    /** Marca el borde en verde (por ejemplo, cuando el filtro está en uso) */
    resaltado?: boolean;
}) {
    const id = useId();
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; minWidth: number; arriba: boolean } | null>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const lista = useRef<HTMLUListElement>(null);
    const busqueda = useRef({ texto: "", hasta: 0 });
    const elegido = opciones.find(o => o.valor === valor);
    const enNavegador = typeof document !== "undefined";

    // Dónde dibujar la lista: debajo del botón, o arriba si abajo no hay lugar
    const ubicar = useCallback(() => {
        const r = boton.current?.getBoundingClientRect();
        if (!r) return;
        const espacioAbajo = window.innerHeight - r.bottom;
        const altoLista = Math.min(ALTO_LISTA, opciones.length * 40 + 14);
        const arriba = espacioAbajo < altoLista + 16 && r.top > espacioAbajo;
        const minWidth = r.width;
        const left = Math.min(r.left, window.innerWidth - Math.max(minWidth, 160) - 8);
        setPos(arriba
            ? { left, bottom: window.innerHeight - r.top + 8, minWidth, arriba }
            : { left, top: r.bottom + 8, minWidth, arriba });
    }, [opciones.length]);

    const abrir = () => {
        if (disabled) return;
        const i = opciones.findIndex(o => o.valor === valor);
        setActivo(i >= 0 ? i : Math.max(0, opciones.findIndex(o => !o.deshabilitada)));
        ubicar();
        setAbierto(true);
    };
    const cerrar = () => setAbierto(false);
    const elegir = (o: OpcionDesplegable<T>) => {
        if (o.deshabilitada) return;
        onCambiar(o.valor);
        setAbierto(false);
        boton.current?.focus({ preventScroll: true });
    };

    // Mientras está abierta: seguir al botón si la página se mueve, y cerrar al tocar afuera
    useEffect(() => {
        if (!abierto) return;
        const afuera = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!boton.current?.contains(t) && !lista.current?.contains(t)) setAbierto(false);
        };
        const alMover = (e: Event) => {
            if (lista.current && e.target instanceof Node && lista.current.contains(e.target)) return;
            ubicar();
        };
        document.addEventListener("mousedown", afuera);
        window.addEventListener("resize", alMover);
        window.addEventListener("scroll", alMover, true);
        return () => {
            document.removeEventListener("mousedown", afuera);
            window.removeEventListener("resize", alMover);
            window.removeEventListener("scroll", alMover, true);
        };
    }, [abierto, ubicar]);

    // La opción marcada con el teclado siempre a la vista
    useLayoutEffect(() => {
        if (!abierto) return;
        document.getElementById(`${id}-op-${activo}`)?.scrollIntoView({ block: "nearest" });
    }, [abierto, activo, id]);

    const mover = (desde: number, paso: 1 | -1) => {
        for (let k = 1; k <= opciones.length; k++) {
            const i = (desde + paso * k + opciones.length) % opciones.length;
            if (!opciones[i].deshabilitada) return i;
        }
        return desde;
    };

    const alTeclear = (e: React.KeyboardEvent) => {
        if (!abierto) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                e.preventDefault();
                abrir();
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cerrar();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo(i => mover(i, 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo(i => mover(i, -1));
        } else if (e.key === "Home") {
            e.preventDefault();
            setActivo(mover(-1, 1));
        } else if (e.key === "End") {
            e.preventDefault();
            setActivo(mover(opciones.length, -1));
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (opciones[activo]) elegir(opciones[activo]);
        } else if (e.key === "Tab") {
            cerrar();
        } else if (e.key.length === 1 && /\S/.test(e.key)) {
            // Escribir letras salta a la primera opción que empieza así
            const ahora = Date.now();
            const b = busqueda.current;
            b.texto = (ahora < b.hasta ? b.texto : "") + e.key.toLowerCase();
            b.hasta = ahora + 600;
            const i = opciones.findIndex(o => !o.deshabilitada && o.titulo.toLowerCase().startsWith(b.texto));
            if (i >= 0) setActivo(i);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                ref={boton}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-controls={`${id}-lista`}
                aria-label={etiqueta ? `${etiqueta}: ${elegido?.titulo ?? placeholder}` : undefined}
                aria-activedescendant={abierto ? `${id}-op-${activo}` : undefined}
                disabled={disabled}
                onClick={() => (abierto ? cerrar() : abrir())}
                onKeyDown={alTeclear}
                className={`w-full ${ALTOS[alto]} ${FONDOS[fondo]} flex items-center gap-2.5 pl-3.5 pr-3 rounded-xl border text-left cursor-pointer outline-none transition-[border-color,box-shadow,color] duration-150 focus-visible:ring-2 focus-visible:ring-[#7D9878]/25 disabled:opacity-55 disabled:cursor-not-allowed ${abierto
                    ? "border-[#7D9878]/70 ring-2 ring-[#7D9878]/20"
                    : resaltado
                        ? "border-[#7D9878]/60"
                        : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50"} ${claseBoton}`}
            >
                {icono && <span className="shrink-0 flex text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">{icono}</span>}
                <span className={`flex-1 min-w-0 truncate ${elegido ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/40 dark:text-[#F4EFEA]/35"}`}>
                    {elegido?.titulo ?? placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 transition-transform duration-200 ease-out ${abierto ? "rotate-180" : ""}`} />
            </button>

            {/* Para que el formulario avise si es obligatorio y quedó vacío */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden
                    required
                    value={valor}
                    onChange={() => {}}
                    onFocus={() => boton.current?.focus()}
                    className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
                />
            )}

            {enNavegador && createPortal(
                <AnimatePresence>
                    {abierto && pos && (
                        <motion.ul
                            ref={lista}
                            id={`${id}-lista`}
                            role="listbox"
                            aria-label={etiqueta}
                            initial={{ opacity: 0, y: pos.arriba ? 4 : -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
                            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1, ease: "easeOut" } }}
                            style={{
                                position: "fixed",
                                left: pos.left,
                                top: pos.top,
                                bottom: pos.bottom,
                                minWidth: pos.minWidth,
                                maxHeight: ALTO_LISTA,
                                zIndex: 1000,
                                transformOrigin: pos.arriba ? "bottom left" : "top left",
                            }}
                            className="w-max max-w-[min(22rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain custom-scrollbar p-1.5 rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-xl shadow-[#2C2C2C]/10 dark:shadow-black/40"
                        >
                            {opciones.map((o, i) => {
                                const esElegida = o.valor === valor;
                                return (
                                    <li
                                        key={`${o.valor}-${i}`}
                                        id={`${id}-op-${i}`}
                                        role="option"
                                        aria-selected={esElegida}
                                        aria-disabled={o.deshabilitada || undefined}
                                        onMouseEnter={() => !o.deshabilitada && setActivo(i)}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => elegir(o)}
                                        className={`flex items-center justify-between gap-4 min-h-10 px-3 py-2 rounded-xl text-sm select-none transition-colors duration-100 ${o.deshabilitada
                                            ? "text-[#2C2C2C]/35 dark:text-[#F4EFEA]/30 cursor-default"
                                            : `cursor-pointer ${i === activo ? "bg-[#F4EFEA] dark:bg-white/[0.06]" : ""} ${esElegida
                                                ? "font-semibold text-[#3F5A3C] dark:text-[#C5D6BF]"
                                                : "text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80"}`}`}
                                    >
                                        <span className="min-w-0">{o.titulo}</span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            {o.extra && <span className="text-xs font-normal tabular-nums text-[#2C2C2C]/40 dark:text-[#F4EFEA]/35">{o.extra}</span>}
                                            <Check className={`w-4 h-4 text-[#7D9878] dark:text-[#A3B69B] ${esElegida ? "" : "invisible"}`} strokeWidth={2.5} />
                                        </span>
                                    </li>
                                );
                            })}
                        </motion.ul>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </div>
    );
}

// ── Reemplazo directo del <select> del navegador ────────────────────────────
// Se usa igual: <Selector value onChange className> con <option> adentro, y se dibuja con el
// desplegable de arriba. Del className solo se toma lo que define el ancho y el alto.

type HijoOpcion = { valor: string; titulo: string; deshabilitada: boolean };

function textoDe(nodo: ReactNode): string {
    if (nodo == null || typeof nodo === "boolean") return "";
    if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
    if (Array.isArray(nodo)) return nodo.map(textoDe).join("");
    if (isValidElement<{ children?: ReactNode }>(nodo)) return textoDe(nodo.props.children);
    return "";
}

function leerOpciones(hijos: ReactNode, salida: HijoOpcion[] = []): HijoOpcion[] {
    Children.forEach(hijos, hijo => {
        if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(hijo)) return;
        if (hijo.type === "option") {
            const titulo = textoDe(hijo.props.children).trim();
            salida.push({
                valor: hijo.props.value !== undefined ? String(hijo.props.value) : titulo,
                titulo,
                deshabilitada: !!hijo.props.disabled,
            });
        } else {
            leerOpciones(hijo.props.children, salida); // fragmentos y listas
        }
    });
    return salida;
}

const CLASES_DE_TAMANO = /^((sm|md|lg|xl|2xl):)?(w-|min-w-|max-w-|flex-|grow|shrink|basis-|col-span|self-|order-)/;

export function Selector({ value, onChange, children, className = "", required, disabled, title, icono, resaltado, ...resto }: {
    value: string | number | undefined;
    onChange?: (e: { target: { value: string } }) => void;
    children: ReactNode;
    className?: string;
    required?: boolean;
    disabled?: boolean;
    title?: string;
    icono?: ReactNode;
    resaltado?: boolean;
    "aria-label"?: string;
}) {
    const todas = leerOpciones(children);
    // Una opción vacía y desactivada ("Elegí uno") es el texto guía, no una opción
    const guia = todas.find(o => o.valor === "" && o.deshabilitada);
    const opciones = todas
        .filter(o => o !== guia)
        .map(o => ({ valor: o.valor, titulo: o.titulo, deshabilitada: o.deshabilitada }));
    const tamano = className.split(/\s+/).filter(c => CLASES_DE_TAMANO.test(c)).join(" ");
    const alto = /(^|\s)(h-9|h-8|py-1|py-1\.5|text-xs)(\s|$)/.test(className) ? "sm"
        : /(^|\s)(h-10|py-2|py-2\.5)(\s|$)/.test(className) ? "md" : "lg";
    const fondo = /(^|\s)bg-white(\s|$)/.test(className) ? "blanco" : "crema";

    return (
        <Desplegable
            valor={value === undefined || value === null ? "" : String(value)}
            opciones={opciones}
            onCambiar={v => onChange?.({ target: { value: v } })}
            etiqueta={resto["aria-label"] || title}
            placeholder={guia?.titulo}
            icono={icono}
            alto={alto}
            fondo={fondo}
            required={required}
            disabled={disabled}
            resaltado={resaltado}
            className={tamano}
        />
    );
}
