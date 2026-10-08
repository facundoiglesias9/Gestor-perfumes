"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
    Trash2, Search, Activity, ShieldCheck, ChevronDown, X, Lock, Copy,
    ShoppingBag, Truck, Package, Users, DollarSign, Mail, Tags, Database,
    type LucideIcon
} from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

type LogEntry = {
    id: string;
    timestamp: string;
    ts?: number; // los registros nuevos guardan la hora exacta; los viejos solo traen el texto
    type: "info" | "error" | "db" | "auth" | "warn";
    message: string;
    details?: any;
};

// Mismo tope que guarda AppContext, así lo que se ve es lo que queda al recargar.
const MAX_LOGS = 100;

// ── Área: de qué parte del negocio habla cada registro ──────────────
type AreaKey = "ventas" | "pedidos" | "stock" | "usuarios" | "dolar" | "correo" | "catalogo" | "sistema";

const AREAS: Record<AreaKey, { label: string; icon: LucideIcon }> = {
    ventas: { label: "Ventas", icon: ShoppingBag },
    pedidos: { label: "Pedidos", icon: Truck },
    stock: { label: "Stock", icon: Package },
    usuarios: { label: "Usuarios", icon: Users },
    dolar: { label: "Dólar", icon: DollarSign },
    correo: { label: "Correo", icon: Mail },
    catalogo: { label: "Catálogo", icon: Tags },
    sistema: { label: "Sistema", icon: Database },
};

// El orden importa: "Stock descontado para pedido" es de stock, "Error al sincronizar dólar" es del dólar.
const areaDe = (log: LogEntry): AreaKey => {
    const m = log.message.toLowerCase();
    if (/email|notificaci[oó]n/.test(m)) return "correo";
    if (/d[oó]lar/.test(m)) return "dolar";
    if (/sincroniz|base de datos|guardando en|eliminando en/.test(m)) return "sistema";
    if (log.type === "auth" || /sesi[oó]n|usuario|mayorista|solicitud/.test(m)) return "usuarios";
    if (/venta|caja/.test(m)) return "ventas";
    if (/stock|inventario/.test(m)) return "stock";
    if (/pedido|pago/.test(m)) return "pedidos";
    if (/producto|cat[aá]logo|duplicado/.test(m)) return "catalogo";
    return "sistema";
};

// Registros viejos guardados con jerga que ya no se usa
const mensajeDe = (log: LogEntry) =>
    log.message.replace(/\s*\(chunk \d+\)/i, "").replace(/ en Xata\b/i, "");

// ── Nivel: si salió bien, si hay que mirarlo o si falló ─────────────
type Nivel = "ok" | "aviso" | "error";

const nivelDe = (log: LogEntry): Nivel => {
    const m = log.message.toLowerCase();
    if (log.type === "error") return "error";
    if (log.type === "db" && /error|fallo/.test(m)) return "error";
    if (log.type === "warn") return "aviso";
    if (log.type === "auth" && /fallid|denegad/.test(m)) return "aviso";
    return "ok";
};

const NIVEL_ESTILO: Record<Nivel, { tile: string; pill?: string; pillLabel?: string; fila: string }> = {
    ok: {
        tile: "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B]",
        fila: "",
    },
    aviso: {
        tile: "bg-[#DAC4AA]/30 dark:bg-[#DAC4AA]/15 text-[#8A6A3F] dark:text-[#DAC4AA]",
        pill: "bg-[#DAC4AA]/30 dark:bg-[#DAC4AA]/15 text-[#7A5C34] dark:text-[#DAC4AA]",
        pillLabel: "Atención",
        fila: "bg-[#DAC4AA]/[0.07]",
    },
    error: {
        tile: "bg-[#C9866F]/15 text-[#B5735C] dark:text-[#DBA793]",
        pill: "bg-[#C9866F]/15 text-[#97604D] dark:text-[#DBA793]",
        pillLabel: "Error",
        fila: "bg-[#C9866F]/[0.06]",
    },
};

// ── Fechas ──────────────────────────────────────────────────────────
// Los registros viejos solo tienen el texto de es-AR: "08/10/2026, 12:36:35 p. m."
const fechaDe = (log: LogEntry): Date | null => {
    if (log.ts) return new Date(log.ts);
    const m = log.timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?/i);
    if (!m) return null;
    let hora = Number(m[4]);
    const ampm = m[7]?.toLowerCase();
    if (ampm === "p" && hora < 12) hora += 12;
    if (ampm === "a" && hora === 12) hora = 0;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hora, Number(m[5]), Number(m[6] || 0));
};

const inicioDelDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const etiquetaDia = (d: Date | null, ahora: number) => {
    if (!d) return "Sin fecha";
    const dias = Math.round((inicioDelDia(new Date(ahora)) - inicioDelDia(d)) / 86_400_000);
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Ayer";
    const texto = d.toLocaleDateString("es-AR", {
        weekday: "long", day: "numeric", month: "long",
        year: d.getFullYear() !== new Date(ahora).getFullYear() ? "numeric" : undefined,
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const hora = (d: Date | null) =>
    d ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--";

const haceCuanto = (d: Date | null, ahora: number) => {
    if (!d) return "—";
    const min = Math.floor((ahora - d.getTime()) / 60_000);
    if (min < 1) return "recién";
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? "ayer" : `hace ${dias} días`;
};

// ── Detalle: datos técnicos en palabras ─────────────────────────────
const ETIQUETAS: Record<string, string> = {
    total: "Total",
    items: "Productos",
    cliente: "Cliente",
    error: "Error",
    errores: "Errores",
    message: "Mensaje",
    code: "Código",
    source: "Fuente",
    method: "Ingresó por",
    orderId: "Pedido",
    user: "Usuario",
    table: "Tabla",
    status: "Estado",
    tablas_cargadas: "Registros cargados",
    contexto_admin: "Como administrador",
    desde: "Desde el registro",
};

const VALORES: Record<string, Record<string, string>> = {
    method: { context: "Usuarios ya cargados", xata_table: "Tabla de usuarios" },
};

const etiquetaDe = (clave: string) => {
    if (ETIQUETAS[clave]) return ETIQUETAS[clave];
    const t = clave.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
};

const esObjetoPlano = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

function ValorDetalle({ clave, valor }: { clave: string; valor: unknown }): ReactNode {
    if (valor === null || valor === undefined || valor === "") return <span className="text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">—</span>;
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (typeof valor === "number") {
        if (clave === "total") return `$ ${valor.toLocaleString("es-AR")}`;
        return valor.toLocaleString("es-AR");
    }
    if (typeof valor === "string") return VALORES[clave]?.[valor] ?? valor;

    if (Array.isArray(valor)) {
        if (valor.length === 0) return <span className="text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">Ninguno</span>;
        if (valor.every(v => typeof v !== "object" || v === null)) return valor.map(v => String(v ?? "—")).join(" · ");
    }

    if (esObjetoPlano(valor)) {
        // Los errores suelen venir como { message, code }
        if (typeof valor.message === "string") {
            return valor.code ? `${valor.message} (código ${valor.code})` : valor.message;
        }
        const entradas = Object.entries(valor);
        if (entradas.length === 0) return <span className="text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">Sin más información</span>;
        if (entradas.every(([, v]) => typeof v !== "object" || v === null)) {
            return (
                <span className="flex flex-wrap gap-1.5">
                    {entradas.map(([k, v]) => (
                        <span key={k} className="inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded-md bg-[#F4EFEA] dark:bg-[#242723] text-xs">
                            <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">{etiquetaDe(k)}</span>
                            <span className="font-semibold tabular-nums">{typeof v === "number" ? v.toLocaleString("es-AR") : String(v ?? "—")}</span>
                        </span>
                    ))}
                </span>
            );
        }
    }

    return (
        <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75">
            {JSON.stringify(valor, null, 2)}
        </pre>
    );
}

function Detalle({ log }: { log: LogEntry }) {
    const copiar = async () => {
        const texto = `${log.timestamp} · ${log.message}\n${JSON.stringify(log.details, null, 2)}`;
        try {
            await navigator.clipboard.writeText(texto);
            toast.success("Detalle copiado");
        } catch {
            toast.error("No se pudo copiar");
        }
    };

    const d = log.details;
    return (
        <div className="px-4 pb-4 pl-4 sm:pl-[6.25rem]">
            <div className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] p-4">
                {esObjetoPlano(d) ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                        {Object.entries(d).map(([clave, valor]) => (
                            <div key={clave} className="contents">
                                <dt className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">{etiquetaDe(clave)}</dt>
                                <dd className="font-medium text-[#2C2C2C] dark:text-[#F4EFEA] min-w-0 break-words mb-2 sm:mb-0">
                                    <ValorDetalle clave={clave} valor={valor} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                ) : (
                    <div className="text-sm font-medium"><ValorDetalle clave="" valor={d} /></div>
                )}
                <div className="flex justify-end mt-3">
                    <button
                        onClick={copiar}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-white dark:hover:bg-[#242723] transition-[background-color,color,transform] duration-150 active:scale-[0.97]"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar detalle
                    </button>
                </div>
            </div>
        </div>
    );
}

type Filtro = "todo" | "problemas" | AreaKey;

export default function LogsPage() {
    const { currentUser } = useAppContext();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("todo");
    const [abierto, setAbierto] = useState<string | null>(null);
    const [confirmarVaciar, setConfirmarVaciar] = useState(false);
    const [nuevos, setNuevos] = useState<Set<string>>(new Set());
    const [ahora, setAhora] = useState(() => Date.now());
    const buscadorRef = useRef<HTMLInputElement>(null);

    // Registros guardados + los que llegan mientras la página está abierta (los emite AppContext)
    useEffect(() => {
        const guardados = localStorage.getItem("system_logs");
        if (guardados) {
            try { setLogs(JSON.parse(guardados)); } catch { }
        }

        (window as any).__onNewLog = (log: LogEntry) => {
            setLogs(prev => [log, ...prev].slice(0, MAX_LOGS));
            setNuevos(prev => new Set(prev).add(log.id));
        };

        return () => {
            delete (window as any).__onNewLog;
        };
    }, []);

    // "hace 3 min" se mantiene al día sin recargar
    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);

    const vaciar = () => {
        setLogs([]);
        setAbierto(null);
        localStorage.removeItem("system_logs");
        setConfirmarVaciar(false);
    };

    // Cada registro con su área, nivel y fecha ya resueltos
    const enriquecidos = useMemo(() => logs.map(log => {
        const area = areaDe(log);
        const mensaje = mensajeDe(log);
        return {
            log,
            area,
            mensaje,
            nivel: nivelDe(log),
            fecha: fechaDe(log),
            texto: `${mensaje} ${AREAS[area].label} ${JSON.stringify(log.details ?? "")}`.toLowerCase(),
        };
    }), [logs]);

    const resumen = useMemo(() => {
        const hoy = inicioDelDia(new Date(ahora));
        return {
            hoy: enriquecidos.filter(e => e.fecha && inicioDelDia(e.fecha) === hoy).length,
            problemas: enriquecidos.filter(e => e.nivel !== "ok").length,
            ultimo: enriquecidos[0]?.fecha ?? null,
        };
    }, [enriquecidos, ahora]);

    // Solo se ofrecen las áreas que tienen registros, de la más usada a la menos
    const filtros = useMemo(() => {
        const conteo = new Map<AreaKey, number>();
        enriquecidos.forEach(e => conteo.set(e.area, (conteo.get(e.area) || 0) + 1));
        const areas = [...conteo.entries()].sort((a, b) => b[1] - a[1]);
        return [
            { key: "todo" as Filtro, label: "Todo", count: enriquecidos.length },
            { key: "problemas" as Filtro, label: "Problemas", count: resumen.problemas },
            ...areas.map(([key, count]) => ({ key: key as Filtro, label: AREAS[key].label, count })),
        ];
    }, [enriquecidos, resumen.problemas]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return enriquecidos.filter(e => {
            if (filtro === "problemas" && e.nivel === "ok") return false;
            if (filtro !== "todo" && filtro !== "problemas" && e.area !== filtro) return false;
            return !q || e.texto.includes(q);
        });
    }, [enriquecidos, filtro, busqueda]);

    // Agrupados por día, respetando el orden (lo más nuevo arriba)
    const grupos = useMemo(() => {
        const lista: { dia: string; items: typeof visibles }[] = [];
        visibles.forEach(e => {
            const dia = etiquetaDia(e.fecha, ahora);
            const ultimo = lista[lista.length - 1];
            if (ultimo && ultimo.dia === dia) ultimo.items.push(e);
            else lista.push({ dia, items: [e] });
        });
        return lista;
    }, [visibles, ahora]);

    const hayFiltros = filtro !== "todo" || busqueda.trim() !== "";
    const limpiarFiltros = () => { setFiltro("todo"); setBusqueda(""); };

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center p-12 bg-white dark:bg-[#242723] rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-2xl">
                    <div className="w-24 h-24 bg-[#C9866F]/10 rounded-full flex items-center justify-center mx-auto mb-6 outline outline-8 outline-[#C9866F]/10">
                        <Lock className="w-10 h-10 text-[#C9866F]" />
                    </div>
                    <h1 className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Acceso Restringido</h1>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-2 font-bold">La consola de sistema es exclusiva para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Encabezado: qué es y cómo viene el día */}
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 bg-white dark:bg-[#242723] p-6 md:p-8 rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] text-[11px] font-bold tracking-widest uppercase border border-[#E6DFD5] dark:border-[#353B33]">
                        <Activity className="w-3.5 h-3.5" />
                        Registro de actividad
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                        Logs
                    </h1>
                    <p className="text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 max-w-xl leading-relaxed">
                        Ventas, pedidos, movimientos de stock, ingresos al sistema y errores, del más nuevo al más viejo.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <dl className="flex items-stretch rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] divide-x divide-[#E6DFD5] dark:divide-[#353B33]">
                        <div className="px-4 py-2.5">
                            <dt className="text-[11px] font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Hoy</dt>
                            <dd className="text-lg font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] leading-tight">
                                {resumen.hoy} <span className="text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">{resumen.hoy === 1 ? "evento" : "eventos"}</span>
                            </dd>
                        </div>
                        <div className="px-4 py-2.5">
                            <dt className="text-[11px] font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Problemas</dt>
                            <dd className={`text-lg font-bold tabular-nums leading-tight ${resumen.problemas > 0 ? "text-[#B5735C] dark:text-[#DBA793]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                {resumen.problemas}
                            </dd>
                        </div>
                        <div className="px-4 py-2.5">
                            <dt className="text-[11px] font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Último</dt>
                            <dd className="text-lg font-bold text-[#2C2C2C] dark:text-[#F4EFEA] leading-tight">{haceCuanto(resumen.ultimo, ahora)}</dd>
                        </div>
                    </dl>

                    <button
                        onClick={() => setConfirmarVaciar(true)}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 h-11 px-4 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#97604D] dark:hover:text-[#DBA793] hover:border-[#C9866F]/40 hover:bg-[#C9866F]/10 transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
                    >
                        <Trash2 className="w-4 h-4" />
                        Vaciar
                    </button>
                </div>
            </header>

            <section className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                {/* Buscador y filtros */}
                <div className="p-4 md:p-5 space-y-3 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none" />
                        <input
                            ref={buscadorRef}
                            type="search"
                            aria-label="Buscar en los registros"
                            placeholder="Buscar en los registros…"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full h-11 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl pl-11 pr-10 text-sm text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/45 dark:placeholder:text-[#F4EFEA]/40 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] [&::-webkit-search-cancel-button]:hidden"
                        />
                        {busqueda && (
                            <button
                                onClick={() => { setBusqueda(""); buscadorRef.current?.focus(); }}
                                aria-label="Borrar búsqueda"
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#E6DFD5]/60 dark:hover:bg-[#353B33]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div role="group" aria-label="Filtrar por tipo" className="flex gap-1.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filtros.map(f => {
                            const activo = filtro === f.key;
                            const esProblemas = f.key === "problemas";
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFiltro(f.key)}
                                    aria-pressed={activo}
                                    className={`shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-semibold whitespace-nowrap border transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] ${activo
                                        ? "bg-[#2C2C2C] dark:bg-[#F4EFEA] border-transparent text-white dark:text-[#1B1D1A]"
                                        : "bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#D3CBBF] dark:hover:border-[#474C44]"}`}
                                >
                                    {f.label}
                                    <span className={`min-w-5 h-5 px-1.5 rounded-md text-[11px] font-bold tabular-nums flex items-center justify-center ${activo
                                        ? "bg-white/20 dark:bg-[#1B1D1A]/15"
                                        : esProblemas && f.count > 0
                                            ? "bg-[#C9866F]/15 text-[#97604D] dark:text-[#DBA793]"
                                            : "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                    >
                                        {f.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Lista agrupada por día */}
                {logs.length === 0 ? (
                    <div className="py-20 px-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] flex items-center justify-center mb-4">
                            <ShieldCheck className="w-7 h-7 text-[#7D9878] dark:text-[#A3B69B]" />
                        </div>
                        <p className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Todavía no hay actividad registrada</p>
                        <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-1 max-w-sm">
                            Cuando se registren ventas, pedidos o ingresos al sistema, van a aparecer acá.
                        </p>
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="py-20 px-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] flex items-center justify-center mb-4">
                            <Search className="w-6 h-6 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40" />
                        </div>
                        <p className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                            {filtro === "problemas" && !busqueda.trim() ? "No hay problemas registrados" : "No hay registros que coincidan"}
                        </p>
                        <button
                            onClick={limpiarFiltros}
                            className="mt-4 h-9 px-4 rounded-xl text-sm font-semibold bg-[#7D9878] text-white hover:bg-[#6B8566] transition-[background-color,transform] duration-150 active:scale-[0.97]"
                        >
                            Ver todo
                        </button>
                    </div>
                ) : (
                    <div className="pb-2">
                        {grupos.map(grupo => (
                            <section key={grupo.dia} aria-label={grupo.dia}>
                                <h2 className="sticky top-16 z-10 flex items-center justify-between px-5 py-2 bg-[#FBF9F5]/95 dark:bg-[#242723]/95 backdrop-blur border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 text-xs font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">
                                    <span>{grupo.dia}</span>
                                    <span className="tabular-nums">{grupo.items.length}</span>
                                </h2>
                                <ul className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                    {grupo.items.map(({ log, area, mensaje, nivel, fecha }) => {
                                        const estilo = NIVEL_ESTILO[nivel];
                                        const Icono = AREAS[area].icon;
                                        const tieneDetalle = log.details !== null && log.details !== undefined;
                                        const estaAbierto = abierto === log.id;

                                        const contenido = (
                                            <>
                                                <time
                                                    dateTime={fecha?.toISOString()}
                                                    title={log.timestamp}
                                                    className="w-11 shrink-0 pt-1 text-xs font-medium tabular-nums text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55"
                                                >
                                                    {hora(fecha)}
                                                </time>
                                                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${estilo.tile}`} title={AREAS[area].label}>
                                                    <Icono className="w-4 h-4" />
                                                </span>
                                                <span className="flex-1 min-w-0 pt-1">
                                                    <span className="text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] break-words">{mensaje}</span>
                                                    {estilo.pill && (
                                                        <span className={`ml-2 inline-flex align-middle px-1.5 py-px rounded-md text-[11px] font-semibold ${estilo.pill}`}>
                                                            {estilo.pillLabel}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="hidden sm:block shrink-0 pt-1 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                    {AREAS[area].label}
                                                </span>
                                                <span className="w-6 shrink-0 pt-1.5 flex justify-end" aria-hidden>
                                                    {tieneDetalle && (
                                                        <ChevronDown className={`w-4 h-4 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 transition-transform duration-150 ease-out ${estaAbierto ? "rotate-180" : ""}`} />
                                                    )}
                                                </span>
                                            </>
                                        );

                                        return (
                                            <li key={log.id} className={`${estilo.fila} ${nuevos.has(log.id) ? "log-nuevo" : ""}`}>
                                                {tieneDetalle ? (
                                                    <button
                                                        onClick={() => setAbierto(estaAbierto ? null : log.id)}
                                                        aria-expanded={estaAbierto}
                                                        className="w-full flex items-start gap-3 px-4 sm:px-5 py-2.5 text-left hover:bg-[#F9F6F0] dark:hover:bg-[#2A2E29] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7D9878]/50"
                                                    >
                                                        {contenido}
                                                    </button>
                                                ) : (
                                                    <div className="flex items-start gap-3 px-4 sm:px-5 py-2.5">{contenido}</div>
                                                )}
                                                {estaAbierto && tieneDetalle && <Detalle log={log} />}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}

                <p className="px-5 py-4 border-t border-[#E6DFD5] dark:border-[#353B33] text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                    Se guardan los últimos {MAX_LOGS} registros de esta computadora. Lo que se haga desde otra no aparece acá.
                </p>
            </section>

            <ConfirmModal
                isOpen={confirmarVaciar}
                title="¿Vaciar el registro?"
                message="Se borran todos los registros guardados en esta computadora. No se puede deshacer."
                onConfirm={vaciar}
                onCancel={() => setConfirmarVaciar(false)}
            />
        </div>
    );
}
