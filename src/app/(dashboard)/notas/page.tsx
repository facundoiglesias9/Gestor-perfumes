"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
    StickyNote, Pin, PinOff, Palette, Trash2, Search, X, Check, LoaderCircle,
    CircleAlert, CloudCheck, LockKeyhole, RotateCcw,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
    listarNotas, crearNota, actualizarNota, borrarNota, importarNotas,
    type Nota, type ColorNota,
} from "@/lib/notas-actions";

// Curva de la casa: salida rápida para lo que aparece.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Colores de las notas: el acento marca la nota y el tinte es su fondo (claro y oscuro).
const COLORES: { id: ColorNota; nombre: string; acento: string; tinte: string; tinteOsc: string }[] = [
    { id: "salvia", nombre: "Salvia", acento: "#7D9878", tinte: "#EFF4ED", tinteOsc: "#2C322A" },
    { id: "arena", nombre: "Arena", acento: "#D4A853", tinte: "#FBF4E3", tinteOsc: "#363327" },
    { id: "terracota", nombre: "Terracota", acento: "#C9866F", tinte: "#FAEEE8", tinteOsc: "#35302A" },
    { id: "rosa", nombre: "Rosa", acento: "#D98BA3", tinte: "#FBEEF2", tinteOsc: "#363030" },
    { id: "cielo", nombre: "Cielo", acento: "#6E9BC4", tinte: "#ECF2F8", tinteOsc: "#2A3133" },
    { id: "gris", nombre: "Gris", acento: "#A39E96", tinte: "#FFFFFF", tinteOsc: "#242723" },
];

const colorDe = (id: ColorNota) => COLORES.find(c => c.id === id) ?? COLORES[0];
const estiloColor = (id: ColorNota) => {
    const c = colorDe(id);
    return { "--acento": c.acento, "--tinte": c.tinte, "--tinte-osc": c.tinteOsc } as CSSProperties;
};

const nuevoId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function ajustarAlto(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

// La primera línea de la nota funciona como título
function partes(texto: string) {
    const t = texto.replace(/^\s+/, "");
    const i = t.indexOf("\n");
    return i === -1 ? { titulo: t, cuerpo: "" } : { titulo: t.slice(0, i), cuerpo: t.slice(i + 1).replace(/^\n+/, "") };
}

function fechaCorta(iso: string) {
    const d = new Date(iso);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
    return d.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        ...(d.getFullYear() !== hoy.getFullYear() ? { year: "numeric" } : {}),
    });
}

const fechaLarga = (iso: string) => new Date(iso).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short", hour12: false });

// ── Notas viejas guardadas solo en el navegador ──────────────────────────────
// Antes las notas vivían en este navegador con la clave "reseller_notas_<usuario>".
// La primera vez que se abre la página, se pasan a la base y se deja una copia de respaldo.
const TEXTO_VIEJO_VACIO = "Nueva nota vacía. Haz clic en el lápiz para editarla...";

function colorViejo(clases: unknown): ColorNota {
    const s = String(clases ?? "");
    if (s.includes("yellow")) return "arena";
    if (s.includes("pink")) return "rosa";
    if (s.includes("blue")) return "cielo";
    return "salvia";
}

function leerNotasDelNavegador(uid: string, username: string) {
    const buscada = `reseller_notas_${username}`.toLowerCase();
    const claves: string[] = [];
    const notas: { id: string; texto: string; color: ColorNota; creada: string }[] = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const clave = localStorage.key(i);
            if (!clave || clave.toLowerCase() !== buscada) continue;
            claves.push(clave);
            const lista = JSON.parse(localStorage.getItem(clave) || "[]");
            if (!Array.isArray(lista)) continue;
            for (const n of lista) {
                const texto = typeof n?.text === "string" ? n.text : "";
                if (!texto.trim() || texto.trim() === TEXTO_VIEJO_VACIO) continue;
                const idViejo = String(n.id ?? "").replace(/[^\w-]/g, "").slice(0, 40) || nuevoId();
                notas.push({
                    id: `imp-${uid}-${idViejo}`.slice(0, 64),
                    texto,
                    color: colorViejo(n.color),
                    creada: new Date(Number(n.createdAt) || Date.now()).toISOString(),
                });
            }
        }
    } catch {
        // Si el navegador no deja leer, no hay nada para pasar
    }
    return { claves, notas };
}

function guardarRespaldo(claves: string[]) {
    for (const clave of claves) {
        try {
            localStorage.setItem(`respaldo_${clave}`, localStorage.getItem(clave) ?? "[]");
            localStorage.removeItem(clave);
        } catch {
            // Sin acceso al almacenamiento: queda como estaba
        }
    }
}

// ── Piezas chicas ────────────────────────────────────────────────────────────

function SelectorColor({ valor, onCambiar }: { valor: ColorNota; onCambiar: (c: ColorNota) => void }) {
    return (
        <div role="radiogroup" aria-label="Color de la nota" className="flex items-center gap-1.5">
            {COLORES.map(c => {
                const elegido = valor === c.id;
                return (
                    <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={elegido}
                        aria-label={c.nombre}
                        title={c.nombre}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => onCambiar(c.id)}
                        style={{ backgroundColor: c.acento, ...estiloColor(c.id) }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-[#242723] transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento)] ${elegido ? "ring-2 ring-[var(--acento)]" : ""}`}
                    >
                        {elegido && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                );
            })}
        </div>
    );
}

function BotonIcono({ etiqueta, onClick, activo, peligro, children }: {
    etiqueta: string; onClick: () => void; activo?: boolean; peligro?: boolean; children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={etiqueta}
            title={etiqueta}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 [&_svg]:w-4 [&_svg]:h-4 ${activo
                ? "bg-black/[0.07] dark:bg-white/10 text-[#2C2C2C] dark:text-[#F4EFEA]"
                : peligro
                    ? "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                    : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-black/[0.06] dark:hover:bg-white/10"}`}
        >
            {children}
        </button>
    );
}

function Dato({ valor, etiqueta, icono }: { valor: number; etiqueta: string; icono?: ReactNode }) {
    return (
        <div className="min-w-[112px] px-5 py-3 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-center">
            <p className="text-2xl font-extrabold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] leading-none">{valor}</p>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-semibold text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                {icono}
                {etiqueta}
            </p>
        </div>
    );
}

// ── Escribir una nota nueva ──────────────────────────────────────────────────

function Compositor({ onCrear }: { onCrear: (texto: string, color: ColorNota) => Promise<boolean> }) {
    const [texto, setTexto] = useState("");
    const [color, setColor] = useState<ColorNota>("salvia");
    const [enfocado, setEnfocado] = useState(false);
    const area = useRef<HTMLTextAreaElement>(null);
    const caja = useRef<HTMLDivElement>(null);
    const abierto = enfocado || texto.length > 0;

    const guardar = async () => {
        const limpio = texto.trim();
        if (!limpio) return;
        setTexto("");
        requestAnimationFrame(() => ajustarAlto(area.current));
        const ok = await onCrear(limpio, color);
        if (!ok) {
            // No se guardó: devolvemos el texto para no perderlo
            setTexto(limpio);
            requestAnimationFrame(() => ajustarAlto(area.current));
        }
    };

    const descartar = () => {
        setTexto("");
        requestAnimationFrame(() => ajustarAlto(area.current));
        area.current?.blur();
    };

    return (
        <div
            ref={caja}
            onFocus={() => setEnfocado(true)}
            onBlur={e => {
                if (!caja.current?.contains(e.relatedTarget as Node | null)) setEnfocado(false);
            }}
            style={estiloColor(color)}
            className="anim-entrada relative rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_1px_2px_rgba(44,44,44,0.04)] transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--acento)] focus-within:shadow-[0_10px_30px_rgba(44,44,44,0.08)] dark:focus-within:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
        >
            <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[var(--acento)] transition-colors duration-200" />
            <div className="flex items-start gap-3 px-5 pt-4 pb-3">
                <StickyNote className="w-5 h-5 mt-0.5 shrink-0 text-[var(--acento)] transition-colors duration-200" />
                <textarea
                    ref={area}
                    rows={1}
                    value={texto}
                    onChange={e => {
                        setTexto(e.target.value);
                        ajustarAlto(e.currentTarget);
                    }}
                    onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            guardar();
                        } else if (e.key === "Escape") {
                            e.currentTarget.blur();
                        }
                    }}
                    placeholder="Escribí una nota nueva…"
                    aria-label="Nota nueva"
                    className="flex-1 min-h-[28px] max-h-[50vh] overflow-y-auto bg-transparent resize-none outline-none text-[15px] leading-relaxed text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F4EFEA]/35"
                />
            </div>

            <AnimatePresence initial={false}>
                {abierto && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } }}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap items-center gap-3 px-5 pb-4 pt-1">
                            <SelectorColor valor={color} onCambiar={setColor} />
                            <span className="hidden md:inline text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">
                                La primera línea es el título · <kbd className="font-sans font-semibold">Ctrl + Enter</kbd> guarda
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                                {texto && (
                                    <button
                                        type="button"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={descartar}
                                        className="h-9 px-3 rounded-xl text-sm font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] active:scale-[0.97] transition-[background-color,color,transform] duration-150"
                                    >
                                        Descartar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={!texto.trim()}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={guardar}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 transition-[background-color,opacity,transform] duration-150"
                                >
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    Guardar nota
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Una nota ─────────────────────────────────────────────────────────────────

type EstadoGuardado = "quieto" | "guardando" | "guardado" | "error";

function TarjetaNota({ nota, onGuardarTexto, onCambiar, onBorrar }: {
    nota: Nota;
    onGuardarTexto: (id: string, texto: string) => Promise<boolean>;
    onCambiar: (nota: Nota, cambios: { color?: ColorNota; fijada?: boolean }) => void;
    onBorrar: (nota: Nota) => void;
}) {
    const [editando, setEditando] = useState(false);
    const [texto, setTexto] = useState(nota.texto);
    const [estado, setEstado] = useState<EstadoGuardado>("quieto");
    const [paleta, setPaleta] = useState(false);
    const area = useRef<HTMLTextAreaElement>(null);
    const tarjeta = useRef<HTMLElement>(null);
    // Lo que falta guardar: se guarda solo al dejar de escribir, al salir de la nota o al cambiar de página
    const pendiente = useRef<{ timer: ReturnType<typeof setTimeout> | null; texto: string; guardado: string }>({
        timer: null, texto: nota.texto, guardado: nota.texto,
    });
    const cola = useRef<Promise<void>>(Promise.resolve());

    // Los guardados van en fila: así nunca llega uno viejo después de uno nuevo
    const guardar = useCallback((valor: string) => {
        const p = pendiente.current;
        if (p.timer) {
            clearTimeout(p.timer);
            p.timer = null;
        }
        cola.current = cola.current.then(async () => {
            if (valor === p.guardado) return;
            setEstado("guardando");
            const ok = await onGuardarTexto(nota.id, valor);
            if (ok) {
                p.guardado = valor;
                setEstado("guardado");
            } else {
                setEstado("error");
            }
        });
    }, [nota.id, onGuardarTexto]);

    // Si se sale de la página con algo escrito sin guardar, se guarda igual
    useEffect(() => {
        const p = pendiente.current;
        return () => {
            if (p.timer && p.texto.trim()) guardar(p.texto);
        };
    }, [guardar]);

    useEffect(() => {
        if (estado !== "guardado") return;
        const t = setTimeout(() => setEstado("quieto"), 2000);
        return () => clearTimeout(t);
    }, [estado]);

    useEffect(() => {
        if (!editando) return;
        const el = area.current;
        if (!el) return;
        ajustarAlto(el);
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, [editando]);

    useEffect(() => {
        if (!paleta) return;
        const afuera = (e: MouseEvent) => {
            if (!tarjeta.current?.contains(e.target as Node)) setPaleta(false);
        };
        const tecla = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPaleta(false);
        };
        document.addEventListener("mousedown", afuera);
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("mousedown", afuera);
            document.removeEventListener("keydown", tecla);
        };
    }, [paleta]);

    const empezar = () => {
        const p = pendiente.current;
        p.texto = nota.texto;
        p.guardado = nota.texto;
        setTexto(nota.texto);
        setEstado("quieto");
        setEditando(true);
    };

    const escribir = (valor: string) => {
        const p = pendiente.current;
        setTexto(valor);
        p.texto = valor;
        if (p.timer) clearTimeout(p.timer);
        p.timer = setTimeout(() => {
            p.timer = null;
            if (valor.trim()) guardar(valor);
        }, 800);
    };

    const terminar = () => {
        const p = pendiente.current;
        if (p.timer) {
            clearTimeout(p.timer);
            p.timer = null;
        }
        setEditando(false);
        // Si quedó vacía se borra (con opción de deshacer, que la devuelve como estaba guardada)
        if (!p.texto.trim()) {
            onBorrar(nota);
            return;
        }
        guardar(p.texto);
    };

    const { titulo, cuerpo } = partes(nota.texto);
    const editada = nota.editada !== nota.creada;

    return (
        <motion.article
            ref={tarjeta}
            layout="position"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: "easeOut" } }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            style={estiloColor(nota.color)}
            className={`group relative rounded-2xl border bg-[var(--tinte)] dark:bg-[var(--tinte-osc)] shadow-[0_1px_2px_rgba(44,44,44,0.04)] hover:shadow-[0_10px_30px_rgba(44,44,44,0.08)] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-[box-shadow,border-color] duration-200 ${paleta ? "z-30" : ""} ${editando ? "border-[var(--acento)]" : "border-[#E6DFD5]/80 dark:border-[#353B33]"}`}
        >
            <span aria-hidden className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-[var(--acento)]" />

            <div className="flex items-center justify-between gap-2 pl-5 pr-2.5 pt-2.5">
                <p
                    className="flex items-center gap-1.5 min-w-0 text-[11px] font-semibold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45"
                    title={`Creada el ${fechaLarga(nota.creada)}${editada ? ` · Última edición: ${fechaLarga(nota.editada)}` : ""}`}
                >
                    {nota.fijada && <Pin className="w-3 h-3 shrink-0 text-[var(--acento)] fill-current" />}
                    <span className="truncate">{fechaCorta(nota.creada)}</span>
                    {estado === "guardando" && (
                        <span className="flex items-center gap-1 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">
                            · <LoaderCircle className="w-3 h-3 animate-spin" /> Guardando
                        </span>
                    )}
                    {estado === "guardado" && (
                        <span className="anim-entrada flex items-center gap-1 text-[#5A7356] dark:text-[#A3B69B]">
                            · <Check className="w-3 h-3" strokeWidth={3} /> Guardado
                        </span>
                    )}
                    {estado === "error" && (
                        <button
                            type="button"
                            onClick={() => guardar(pendiente.current.texto)}
                            className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline"
                        >
                            · <CircleAlert className="w-3 h-3" /> No se guardó, reintentar
                        </button>
                    )}
                </p>

                <div className={`flex items-center gap-0.5 shrink-0 transition-opacity duration-150 ${paleta || editando
                    ? "opacity-100"
                    : "[@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
                >
                    <BotonIcono etiqueta={nota.fijada ? "Desfijar" : "Fijar arriba"} onClick={() => onCambiar(nota, { fijada: !nota.fijada })}>
                        {nota.fijada ? <PinOff /> : <Pin />}
                    </BotonIcono>
                    <div className="relative">
                        <BotonIcono etiqueta="Cambiar color" activo={paleta} onClick={() => setPaleta(v => !v)}>
                            <Palette />
                        </BotonIcono>
                        <AnimatePresence>
                            {paleta && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
                                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1, ease: "easeOut" } }}
                                    style={{ transformOrigin: "top right" }}
                                    className="absolute right-0 top-full mt-1.5 z-20 p-2.5 rounded-xl bg-white dark:bg-[#2A2E29] border border-[#E6DFD5] dark:border-[#353B33] shadow-xl shadow-[#2C2C2C]/10 dark:shadow-black/40"
                                >
                                    <SelectorColor
                                        valor={nota.color}
                                        onCambiar={color => {
                                            setPaleta(false);
                                            if (color !== nota.color) onCambiar(nota, { color });
                                        }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <BotonIcono etiqueta="Borrar nota" peligro onClick={() => onBorrar(nota)}>
                        <Trash2 />
                    </BotonIcono>
                </div>
            </div>

            {editando ? (
                <div className="pl-5 pr-4 pb-4 pt-1">
                    <textarea
                        ref={area}
                        rows={3}
                        value={texto}
                        onChange={e => {
                            escribir(e.target.value);
                            ajustarAlto(e.currentTarget);
                        }}
                        onBlur={terminar}
                        onKeyDown={e => {
                            if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
                                e.preventDefault();
                                e.currentTarget.blur();
                            }
                        }}
                        aria-label="Texto de la nota"
                        className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed text-[#2C2C2C] dark:text-[#F4EFEA]"
                    />
                    <p className="mt-1 text-[11px] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">
                        Se guarda solo · <kbd className="font-sans font-semibold">Esc</kbd> para terminar
                    </p>
                </div>
            ) : (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={empezar}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            empezar();
                        }
                    }}
                    title="Tocá para editar"
                    className="pl-5 pr-4 pb-4 pt-1 cursor-text rounded-b-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--acento)]"
                >
                    <p className="text-[15px] font-bold leading-snug text-[#2C2C2C] dark:text-[#F4EFEA] break-words">{titulo}</p>
                    {cuerpo && (
                        <p className="mt-1.5 text-sm leading-relaxed text-[#2C2C2C]/75 dark:text-[#F4EFEA]/70 whitespace-pre-wrap break-words line-clamp-[12]">
                            {cuerpo}
                        </p>
                    )}
                </div>
            )}
        </motion.article>
    );
}

function Grilla({ notas, ...acciones }: {
    notas: Nota[];
    onGuardarTexto: (id: string, texto: string) => Promise<boolean>;
    onCambiar: (nota: Nota, cambios: { color?: ColorNota; fijada?: boolean }) => void;
    onBorrar: (nota: Nota) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
            <AnimatePresence initial={false}>
                {notas.map(n => <TarjetaNota key={n.id} nota={n} {...acciones} />)}
            </AnimatePresence>
        </div>
    );
}

function TituloSeccion({ icono, children, cantidad }: { icono?: ReactNode; children: ReactNode; cantidad: number }) {
    return (
        <h2 className="flex items-center gap-2 px-1 mb-3 text-[11px] font-bold uppercase tracking-widest text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">
            {icono}
            {children}
            <span className="tabular-nums font-semibold text-[#2C2C2C]/35 dark:text-[#F4EFEA]/30">{cantidad}</span>
        </h2>
    );
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function NotasPage() {
    const { currentUser } = useAppContext();
    const uid = currentUser?.id;
    const username = currentUser?.username;
    const [notas, setNotas] = useState<Nota[]>([]);
    const [carga, setCarga] = useState<"cargando" | "lista" | "error">("cargando");
    const [busqueda, setBusqueda] = useState("");
    const [filtroColor, setFiltroColor] = useState<ColorNota | "todas">("todas");
    const importacionHecha = useRef(false);

    const cargar = useCallback(async () => {
        const r = await listarNotas();
        if (r.ok) {
            setNotas(r.dato ?? []);
            setCarga("lista");
        } else {
            setCarga("error");
        }
        return r.ok;
    }, []);

    useEffect(() => {
        if (!uid || !username) return;
        (async () => {
            const ok = await cargar();
            if (!ok || importacionHecha.current) return;
            importacionHecha.current = true;
            const { claves, notas: viejas } = leerNotasDelNavegador(uid, username);
            if (claves.length === 0) return;
            if (viejas.length === 0) {
                guardarRespaldo(claves);
                return;
            }
            const r = await importarNotas(viejas);
            if (!r.ok) {
                toast.error("No se pudieron pasar tus notas anteriores", { description: r.error });
                return;
            }
            guardarRespaldo(claves);
            if ((r.dato ?? 0) > 0) {
                await cargar();
                toast.success(r.dato === 1 ? "Recuperamos 1 nota anterior" : `Recuperamos ${r.dato} notas anteriores`, {
                    description: "Estaban guardadas solo en este navegador. Ahora quedan en el sistema.",
                });
            }
        })();
    }, [uid, username, cargar]);

    const crear = useCallback(async (texto: string, color: ColorNota) => {
        const ahora = new Date().toISOString();
        const nota: Nota = { id: nuevoId(), texto, color, fijada: false, creada: ahora, editada: ahora };
        setNotas(prev => [nota, ...prev]);
        const r = await crearNota(nota);
        if (!r.ok) {
            setNotas(prev => prev.filter(x => x.id !== nota.id));
            toast.error("No se guardó la nota", { description: r.error });
            return false;
        }
        const guardada = r.dato;
        if (guardada) setNotas(prev => prev.map(x => (x.id === guardada.id ? guardada : x)));
        return true;
    }, []);

    const guardarTexto = useCallback(async (id: string, texto: string) => {
        const r = await actualizarNota(id, { texto });
        if (!r.ok) {
            toast.error("No se guardó el cambio", { description: r.error });
            return false;
        }
        const d = r.dato;
        if (d) setNotas(prev => prev.map(x => (x.id === id ? { ...x, texto: d.texto, editada: d.editada } : x)));
        return true;
    }, []);

    const cambiar = useCallback(async (nota: Nota, cambios: { color?: ColorNota; fijada?: boolean }) => {
        setNotas(prev => prev.map(x => (x.id === nota.id ? { ...x, ...cambios } : x)));
        const r = await actualizarNota(nota.id, cambios);
        if (!r.ok) {
            setNotas(prev => prev.map(x => (x.id === nota.id ? { ...x, color: nota.color, fijada: nota.fijada } : x)));
            toast.error("No se guardó el cambio", { description: r.error });
        }
    }, []);

    const restaurar = useCallback(async (nota: Nota) => {
        setNotas(prev => (prev.some(x => x.id === nota.id) ? prev : [nota, ...prev]));
        const r = await crearNota(nota);
        if (!r.ok) {
            setNotas(prev => prev.filter(x => x.id !== nota.id));
            toast.error("No se pudo recuperar la nota", { description: r.error });
        }
    }, []);

    const borrar = useCallback(async (nota: Nota) => {
        setNotas(prev => prev.filter(x => x.id !== nota.id));
        const r = await borrarNota(nota.id);
        if (!r.ok) {
            setNotas(prev => (prev.some(x => x.id === nota.id) ? prev : [nota, ...prev]));
            toast.error("No se pudo borrar la nota", { description: r.error });
            return;
        }
        toast("Nota borrada", {
            duration: 7000,
            icon: <Trash2 className="w-4 h-4" />,
            action: { label: "Deshacer", onClick: () => restaurar(nota) },
        });
    }, [restaurar]);

    const acciones = { onGuardarTexto: guardarTexto, onCambiar: cambiar, onBorrar: borrar };

    const visibles = useMemo(() => {
        const q = normalizar(busqueda.trim());
        return notas
            .filter(n => (filtroColor === "todas" || n.color === filtroColor) && (!q || normalizar(n.texto).includes(q)))
            .sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.creada.localeCompare(a.creada));
    }, [notas, busqueda, filtroColor]);

    const coloresEnUso = COLORES.filter(c => notas.some(n => n.color === c.id));
    const cantFijadas = notas.filter(n => n.fijada).length;
    const fijadas = visibles.filter(n => n.fijada);
    const otras = visibles.filter(n => !n.fijada);
    const filtrando = busqueda.trim() !== "" || filtroColor !== "todas";

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-16">
            {/* Encabezado centrado, igual que la Lista de Precios */}
            <header className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-[2rem] px-6 py-9 md:px-10 md:py-11 border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                {/* Luz suave detrás del título */}
                <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-36 w-[760px] max-w-full h-72 rounded-full bg-[#7D9878]/[0.14] dark:bg-[#A3B69B]/[0.07] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                        <StickyNote className="w-3.5 h-3.5" />
                        Herramientas personales
                    </span>
                    <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Notas</h1>
                    <p className="mt-3 max-w-2xl text-balance text-base md:text-lg text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 leading-relaxed">
                        Anotá pedidos de clientes, ideas y recordatorios para no olvidarte de nada.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                        <span className="inline-flex items-center gap-1.5">
                            <CloudCheck className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                            Se guardan solas en el sistema, desde cualquier compu o celular
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <LockKeyhole className="w-3.5 h-3.5 text-[#7D9878] dark:text-[#A3B69B]" />
                            Solo las ves vos
                        </span>
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <Dato valor={notas.length} etiqueta={notas.length === 1 ? "nota" : "notas"} icono={<StickyNote className="w-3 h-3" />} />
                        <Dato valor={cantFijadas} etiqueta={cantFijadas === 1 ? "fijada" : "fijadas"} icono={<Pin className="w-3 h-3" />} />
                    </div>
                </div>
            </header>

            <Compositor onCrear={crear} />

            {carga === "cargando" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" aria-label="Cargando notas">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-36 rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] animate-pulse" />
                    ))}
                </div>
            ) : carga === "error" ? (
                <div className="anim-entrada flex flex-col items-center text-center py-14 px-6 rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723]">
                    <CircleAlert className="w-8 h-8 text-rose-500 mb-3" />
                    <h3 className="text-lg font-bold font-brand text-[#2C2C2C] dark:text-[#F4EFEA]">No se pudieron cargar las notas</h3>
                    <p className="mt-1 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Revisá la conexión a internet y probá de nuevo.</p>
                    <button
                        type="button"
                        onClick={() => {
                            setCarga("cargando");
                            cargar();
                        }}
                        className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            ) : notas.length === 0 ? (
                <div className="anim-entrada flex flex-col items-center text-center py-16 px-6 rounded-[2rem] border border-dashed border-[#E6DFD5] dark:border-[#353B33]">
                    <div className="w-14 h-14 rounded-2xl bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] flex items-center justify-center mb-4">
                        <StickyNote className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold font-brand text-[#2C2C2C] dark:text-[#F4EFEA]">Todavía no tenés notas</h3>
                    <p className="mt-1 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 max-w-sm">
                        Escribí arriba lo que no te querés olvidar: un pedido, una idea o un recordatorio.
                    </p>
                </div>
            ) : (
                <div className="anim-entrada space-y-6">
                    {/* Buscador y filtro por color */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1 sm:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 pointer-events-none" />
                            <input
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar en tus notas…"
                                aria-label="Buscar en tus notas"
                                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-sm text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F4EFEA]/35 outline-none focus:border-[#7D9878]/60 focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150"
                            />
                            {busqueda && (
                                <button
                                    type="button"
                                    onClick={() => setBusqueda("")}
                                    aria-label="Limpiar búsqueda"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors duration-150"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {coloresEnUso.length > 1 && (
                            <div role="group" aria-label="Filtrar por color" className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                                {[{ id: "todas" as const, nombre: "Todas", acento: "" }, ...coloresEnUso].map(c => {
                                    const activo = filtroColor === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            aria-pressed={activo}
                                            onClick={() => setFiltroColor(c.id === "todas" || activo ? "todas" : c.id)}
                                            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 ${activo
                                                ? "bg-[#2C2C2C] text-white border-[#2C2C2C] dark:bg-[#F4EFEA] dark:text-[#1B1D1A] dark:border-[#F4EFEA]"
                                                : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50"}`}
                                        >
                                            {c.acento && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.acento }} />}
                                            {c.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {visibles.length === 0 ? (
                        <div className="flex flex-col items-center text-center py-14 px-6 rounded-[2rem] border border-dashed border-[#E6DFD5] dark:border-[#353B33]">
                            <Search className="w-7 h-7 text-[#2C2C2C]/30 dark:text-[#F4EFEA]/30 mb-3" />
                            <p className="text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                                No hay notas que coincidan{busqueda.trim() ? ` con “${busqueda.trim()}”` : ""}.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setBusqueda("");
                                    setFiltroColor("todas");
                                }}
                                className="mt-3 text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline"
                            >
                                Ver todas las notas
                            </button>
                        </div>
                    ) : filtrando || fijadas.length === 0 ? (
                        <Grilla notas={visibles} {...acciones} />
                    ) : (
                        <>
                            <section>
                                <TituloSeccion icono={<Pin className="w-3.5 h-3.5" />} cantidad={fijadas.length}>Fijadas</TituloSeccion>
                                <Grilla notas={fijadas} {...acciones} />
                            </section>
                            {otras.length > 0 && (
                                <section>
                                    <TituloSeccion cantidad={otras.length}>Otras</TituloSeccion>
                                    <Grilla notas={otras} {...acciones} />
                                </section>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
