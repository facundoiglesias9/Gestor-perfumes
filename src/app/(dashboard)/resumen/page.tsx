"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    AreaChart, Area, ReferenceLine,
} from "recharts";
import {
    PieChart, Wallet, ArrowDownLeft, ArrowUpRight, Coins, Clock, Package,
    Table2, BarChart3, ArrowRight, Info, type LucideIcon
} from "lucide-react";
import { useAppContext, type Order, type Transaccion } from "@/context/AppContext";

// ── Colores de los gráficos ─────────────────────────────────────────
// Verde agua = plata que entra, naranja = plata que sale. Salen de la paleta validada de
// la herramienta de gráficos (se distinguen también con daltonismo, en claro y oscuro);
// los verdes y terracotas de la marca son muy apagados y se confunden entre sí.
const VARIABLES_GRAFICOS =
    "[--serie-ingreso:#1baf7a] [--serie-egreso:#eb6834] [--grilla:#ECE6DD] [--eje:#D3CBBF] [--tinta-2:#7F7D74] [--cursor:rgba(44,44,44,0.04)] [--superficie:#FFFFFF] " +
    "dark:[--serie-ingreso:#199e70] dark:[--serie-egreso:#d95926] dark:[--grilla:#30352F] dark:[--eje:#474C44] dark:[--tinta-2:#A5A298] dark:[--cursor:rgba(244,239,234,0.05)] dark:[--superficie:#242723]";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// ── Formatos ────────────────────────────────────────────────────────
const pesos = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;
const pesosCorto = (n: number) =>
    `${n < 0 ? "−" : ""}$${new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(n))}`;
const fechaCorta = (t: number) => new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

// La Caja guarda "8/10/2026" (día/mes/año); las ventas, fecha ISO.
const leerFecha = (texto: string | undefined | null): Date | null => {
    if (!texto) return null;
    const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const d = new Date(texto);
    return isNaN(d.getTime()) ? null : d;
};

// ── Períodos ────────────────────────────────────────────────────────
type Periodo = "mes" | "3m" | "6m" | "anio" | "todo";
const PERIODOS: { key: Periodo; label: string }[] = [
    { key: "mes", label: "Este mes" },
    { key: "3m", label: "3 meses" },
    { key: "6m", label: "6 meses" },
    { key: "anio", label: "Este año" },
    { key: "todo", label: "Todo" },
];
const NOMBRE_PERIODO: Record<Periodo, string> = {
    mes: "este mes", "3m": "los últimos 3 meses", "6m": "los últimos 6 meses", anio: "este año", todo: "todo el período",
};

const MEDIOS_PAGO: Record<string, string> = {
    efectivo: "Efectivo", transferencia: "Transferencia", qr: "QR / Mercado Pago", otro: "Otro",
};

const ventaCobrada = (o: Order) => o.status !== "cancelado" && o.paymentStatus === "pagado";
const precioItem = (it: Order["items"][number]) =>
    Number(it.customPrice ?? (it.priceType === "minorista" ? it.producto?.priceMinorista : it.producto?.price)) || 0;

// ── Piezas de la página ─────────────────────────────────────────────
function Tarjeta({ titulo, subtitulo, icono: Icono, tono, acciones, children, className = "", delay = 0 }: {
    titulo: string;
    subtitulo?: string;
    icono: LucideIcon;
    tono: string;
    acciones?: ReactNode;
    children: ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <section
            style={{ animationDelay: `${delay}ms` }}
            className={`anim-entrada bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm p-5 md:p-6 flex flex-col min-w-0 ${className}`}
        >
            <header className="flex items-start gap-3 mb-5">
                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${tono}`}>
                    <Icono className="w-[18px] h-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] leading-tight">{titulo}</h2>
                    {subtitulo && <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 mt-0.5">{subtitulo}</p>}
                </div>
                {acciones}
            </header>
            {children}
        </section>
    );
}

// Cada gráfico se puede ver también como tabla (para leer los números exactos)
function BotonTabla({ activo, onClick }: { activo: boolean; onClick: () => void }) {
    const Icono = activo ? BarChart3 : Table2;
    return (
        <button
            onClick={onClick}
            aria-pressed={activo}
            title={activo ? "Ver como gráfico" : "Ver como tabla"}
            aria-label={activo ? "Ver como gráfico" : "Ver como tabla"}
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.94] transition-[background-color,color,transform] duration-150"
        >
            <Icono className="w-4 h-4" />
        </button>
    );
}

function SinDatos({ texto = "Sin movimientos en este período" }: { texto?: string }) {
    return (
        <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[#E6DFD5] dark:border-[#353B33]">
            <PieChart className="w-6 h-6 text-[#2C2C2C]/25 dark:text-[#F4EFEA]/25 mb-2" />
            <p className="text-sm text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{texto}</p>
        </div>
    );
}

// Globo del gráfico: el número manda, el nombre de la serie acompaña
function Globo({ active, payload, label, titulo }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white/95 dark:bg-[#1B1D1A]/95 backdrop-blur px-3 py-2 shadow-lg shadow-black/10 min-w-[150px]">
            <p className="text-[11px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 mb-1">{titulo ? titulo(label, payload) : label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
                    <span className="w-3 h-0.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(p.value)}</span>
                    <span className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{p.name}</span>
                </div>
            ))}
        </div>
    );
}

function Leyenda({ items }: { items: { color: string; label: string }[] }) {
    return (
        <div className="flex flex-wrap items-center gap-4 mb-3">
            {items.map(i => (
                <span key={i.label} className="inline-flex items-center gap-2 text-xs font-medium text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: i.color }} />
                    {i.label}
                </span>
            ))}
        </div>
    );
}

function TablaSimple({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
    return (
        <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                        {columnas.map((c, i) => (
                            <th key={c} className={`font-semibold py-2 px-1 ${i === 0 ? "text-left" : "text-right"}`}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                    {filas.map((f, i) => (
                        <tr key={i}>
                            {f.map((v, j) => (
                                <td key={j} className={`py-2 px-1 ${j === 0 ? "text-left text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-right tabular-nums text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80"}`}>{v}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Indicador({ label, valor, detalle, icono: Icono, tono, brillo, delay }: {
    label: string; valor: string; detalle: string; icono: LucideIcon; tono: string; brillo: string; delay: number;
}) {
    return (
        <div
            style={{ animationDelay: `${delay}ms` }}
            className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm p-5 flex flex-col gap-3 min-w-0"
        >
            {/* Brillo suave del color de la tarjeta: identifica sin teñir los números */}
            <span aria-hidden className={`pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl ${brillo}`} />
            <div className="relative flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">{label}</p>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tono}`}>
                    <Icono className="w-[18px] h-[18px]" />
                </span>
            </div>
            <p className="relative text-[28px] leading-none font-semibold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{valor}</p>
            <p className="relative text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 truncate">{detalle}</p>
        </div>
    );
}

// Tonos de los íconos (el color identifica; los números siempre van en tinta)
const TONO = {
    ingreso: "bg-[#1baf7a]/12 text-[#128a5f] dark:bg-[#199e70]/20 dark:text-[#4fd1a0]",
    egreso: "bg-[#eb6834]/12 text-[#c4501f] dark:bg-[#d95926]/20 dark:text-[#f2895c]",
    marca: "bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]",
    arena: "bg-[#DAC4AA]/35 text-[#7A5C34] dark:bg-[#DAC4AA]/15 dark:text-[#DAC4AA]",
};
const BRILLO = {
    ingreso: "bg-[#1baf7a]/15 dark:bg-[#199e70]/20",
    egreso: "bg-[#eb6834]/15 dark:bg-[#d95926]/20",
    marca: "bg-[#7D9878]/20 dark:bg-[#A3B69B]/15",
    arena: "bg-[#DAC4AA]/35 dark:bg-[#DAC4AA]/15",
};

export default function ResumenPage() {
    const { transacciones, orders, productos, esencias, insumos, isLoading } = useAppContext();
    const [periodo, setPeriodo] = useState<Periodo>("anio");
    const [tablas, setTablas] = useState<Record<string, boolean>>({});
    const alternarTabla = (k: string) => setTablas(t => ({ ...t, [k]: !t[k] }));

    const datos = useMemo(() => {
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        // Movimientos de Caja con fecha leída y ordenados del más viejo al más nuevo
        const movs = (transacciones as Transaccion[])
            .map(t => ({ ...t, monto: Number(t.amount) || 0, fecha: leerFecha(t.date) }))
            .filter((t): t is typeof t & { fecha: Date } => t.fecha !== null)
            .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

        const ventas = (orders as Order[])
            .map(o => ({ ...o, fecha: leerFecha(o.date) }))
            .filter((o): o is typeof o & { fecha: Date } => o.fecha !== null);

        // Desde cuándo mira cada período
        const primerDato = Math.min(
            movs[0]?.fecha.getTime() ?? hoy.getTime(),
            ventas.reduce((m, o) => Math.min(m, o.fecha.getTime()), hoy.getTime()),
        );
        const inicioMes = (atras: number) => new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
        const inicio =
            periodo === "mes" ? inicioMes(0)
                : periodo === "3m" ? inicioMes(2)
                    : periodo === "6m" ? inicioMes(5)
                        : periodo === "anio" ? new Date(hoy.getFullYear(), 0, 1)
                            : (() => { const d = new Date(primerDato); return new Date(d.getFullYear(), d.getMonth(), 1); })();
        const enPeriodo = (d: Date) => d >= inicio;

        const movsPeriodo = movs.filter(t => enPeriodo(t.fecha));
        const ingresos = movsPeriodo.filter(t => t.type === "Ingreso");
        const egresos = movsPeriodo.filter(t => t.type === "Egreso");
        const totalIngresos = ingresos.reduce((a, t) => a + t.monto, 0);
        const totalEgresos = egresos.reduce((a, t) => a + t.monto, 0);

        // Plata en caja: todo lo que entró menos todo lo que salió, desde el inicio
        const entroTotal = movs.filter(t => t.type === "Ingreso").reduce((a, t) => a + t.monto, 0);
        const salioTotal = movs.filter(t => t.type === "Egreso").reduce((a, t) => a + t.monto, 0);
        const saldo = entroTotal - salioTotal;

        // Evolución del saldo dentro del período (arranca con lo que había antes)
        let acumulado = movs.filter(t => t.fecha < inicio).reduce((a, t) => a + (t.type === "Ingreso" ? t.monto : -t.monto), 0);
        const puntosSaldo: { t: number; saldo: number; detalle?: string }[] = [{ t: inicio.getTime(), saldo: acumulado }];
        movsPeriodo.forEach(t => {
            acumulado += t.type === "Ingreso" ? t.monto : -t.monto;
            const ultimo = puntosSaldo[puntosSaldo.length - 1];
            if (ultimo.t === t.fecha.getTime()) ultimo.saldo = acumulado;
            else puntosSaldo.push({ t: t.fecha.getTime(), saldo: acumulado });
        });
        puntosSaldo.push({ t: hoy.getTime(), saldo: acumulado });

        // Ingresos y egresos agrupados: por semana si es "este mes", si no por mes
        const grupos: { clave: string; etiqueta: string; Ingresos: number; Egresos: number }[] = [];
        if (periodo === "mes") {
            const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
            for (let d = 1; d <= ultimoDia; d += 7) {
                const hasta = Math.min(d + 6, ultimoDia);
                grupos.push({ clave: String(d), etiqueta: `${d}–${hasta}`, Ingresos: 0, Egresos: 0 });
            }
            movsPeriodo.forEach(t => {
                const g = grupos[Math.floor((t.fecha.getDate() - 1) / 7)];
                if (g) g[t.type === "Ingreso" ? "Ingresos" : "Egresos"] += t.monto;
            });
        } else {
            const variosAnios = inicio.getFullYear() !== hoy.getFullYear();
            for (let m = new Date(inicio); m <= hoy; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
                const mes = m.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
                grupos.push({
                    clave: `${m.getFullYear()}-${m.getMonth()}`,
                    etiqueta: variosAnios ? `${mes} ${String(m.getFullYear()).slice(2)}` : mes,
                    Ingresos: 0,
                    Egresos: 0,
                });
            }
            movsPeriodo.forEach(t => {
                const g = grupos.find(x => x.clave === `${t.fecha.getFullYear()}-${t.fecha.getMonth()}`);
                if (g) g[t.type === "Ingreso" ? "Ingresos" : "Egresos"] += t.monto;
            });
        }

        // Ventas cobradas del período: productos, medios de pago y ganancia
        const cobradas = ventas.filter(o => ventaCobrada(o) && enPeriodo(o.fecha));
        const porProducto = new Map<string, { nombre: string; unidades: number; total: number }>();
        const porMedio = new Map<string, number>();
        let ventaConCosto = 0, costoVendido = 0, itemsSinCosto = 0;
        cobradas.forEach(o => {
            porMedio.set(o.paymentMethod, (porMedio.get(o.paymentMethod) || 0) + (Number(o.total) || 0));
            o.items.forEach(it => {
                const nombre = it.producto?.name || "Producto";
                const precio = precioItem(it) * it.quantity;
                const p = porProducto.get(nombre) || { nombre, unidades: 0, total: 0 };
                p.unidades += it.quantity;
                p.total += precio;
                porProducto.set(nombre, p);

                const costoUnit = Number(it.producto?.cost) || Number(productos.find(x => x.id === it.producto?.id)?.cost) || 0;
                if (costoUnit > 0) {
                    ventaConCosto += precio;
                    costoVendido += costoUnit * it.quantity;
                } else itemsSinCosto++;
            });
        });
        const ganancia = ventaConCosto - costoVendido;
        const topProductos = [...porProducto.values()].sort((a, b) => b.total - a.total).slice(0, 5);
        const totalMedios = [...porMedio.values()].reduce((a, b) => a + b, 0);
        const medios = [...porMedio.entries()]
            .map(([k, v]) => ({ label: MEDIOS_PAGO[k] || k, total: v, parte: totalMedios ? v / totalMedios : 0 }))
            .sort((a, b) => b.total - a.total);

        // Lo que falta cobrar (estado actual, no depende del período)
        const pendientes = ventas.filter(o => o.status !== "cancelado" && o.paymentStatus !== "pagado" && o.paymentStatus !== "rechazado");
        const porCobrar = pendientes.reduce((a, o) => a + (Number(o.total) || 0), 0);

        // Mercadería en stock, valuada al costo
        const valorEsencias = esencias.reduce((a, e) => {
            const p100 = Number(e.price100g), p250 = Number(e.price250g), p30 = Number(e.price30g);
            const porGramo = p100 > 0 ? p100 / 100 : p250 > 0 ? p250 / 250 : p30 > 0 ? p30 / 30 : (Number(e.cost) || 0) / (Number(e.qty) || 1);
            return a + Math.max(0, Number(e.qty) || 0) * porGramo;
        }, 0);
        const valorInsumos = insumos.reduce((a, i) =>
            a + Math.max(0, Number(i.stock) || 0) * ((Number(i.cost) || 0) / (Number(i.qty) || 1)), 0);
        const valorStock = valorEsencias + valorInsumos;

        const ultimos = [...movsPeriodo].reverse().slice(0, 7);

        return {
            inicio, hoy, totalIngresos, totalEgresos, cantIngresos: ingresos.length, cantEgresos: egresos.length,
            saldo, entroTotal, salioTotal, puntosSaldo, grupos, topProductos, medios, ganancia, costoVendido,
            itemsSinCosto, cantVentas: cobradas.length, porCobrar, cantPendientes: pendientes.length,
            valorEsencias, valorInsumos, valorStock, ultimos,
            hayMovimientos: grupos.some(g => g.Ingresos > 0 || g.Egresos > 0),
            movsEnPeriodo: movsPeriodo.length,
        };
    }, [transacciones, orders, productos, esencias, insumos, periodo]);

    // Dónde cruza el cero el saldo, para pintar arriba verde y abajo naranja
    const saldos = datos.puntosSaldo.map(p => p.saldo);
    const maxSaldo = Math.max(0, ...saldos), minSaldo = Math.min(0, ...saldos);
    const corteCero = maxSaldo === minSaldo ? 0.5 : maxSaldo / (maxSaldo - minSaldo);

    const margen = datos.costoVendido > 0 ? Math.round((datos.ganancia / datos.costoVendido) * 100) : null;
    const nombrePeriodo = NOMBRE_PERIODO[periodo];

    return (
        <div className={`space-y-6 pb-12 ${VARIABLES_GRAFICOS}`}>
            {/* Encabezado + período (el período manda sobre todo lo de abajo) */}
            <header className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-[2rem] px-6 py-9 md:px-10 md:py-10 border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-36 w-[760px] max-w-full h-72 rounded-full bg-[#1baf7a]/[0.10] dark:bg-[#199e70]/[0.07] blur-3xl" />
                <div className="relative flex flex-col items-center text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                        <PieChart className="w-3.5 h-3.5" />
                        Finanzas
                    </span>
                    <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                        Resumen
                    </h1>
                    <p className="mt-3 max-w-xl text-base md:text-lg text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 leading-relaxed">
                        Cuánta plata entró, cuánta salió, qué se vende y cuánto vale lo que tenés en stock.
                    </p>

                    <div role="tablist" aria-label="Período" className="mt-7 inline-flex flex-wrap justify-center gap-0.5 p-1 rounded-2xl bg-[#F4EFEA]/80 dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33]">
                        {PERIODOS.map(p => {
                            const activo = periodo === p.key;
                            return (
                                <button
                                    key={p.key}
                                    role="tab"
                                    aria-selected={activo}
                                    onClick={() => setPeriodo(p.key)}
                                    className={`relative h-9 px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo
                                        ? "text-[#2C2C2C] dark:text-[#F4EFEA]"
                                        : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                >
                                    {activo && (
                                        <motion.span
                                            layoutId="periodo-pastilla"
                                            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                            className="absolute inset-0 rounded-xl bg-white dark:bg-[#353B33] shadow-sm shadow-[#2C2C2C]/[0.06] ring-1 ring-[#E6DFD5]/80 dark:ring-white/[0.04]"
                                        />
                                    )}
                                    <span className="relative">{p.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-3 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                        Desde el {datos.inicio.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} hasta hoy
                    </p>
                </div>
            </header>

            {isLoading ? (
                <p className="text-center py-16 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Cargando datos…</p>
            ) : (
                <motion.div
                    key={periodo}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="space-y-6"
                >
                    {/* Indicadores del período */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                        <Indicador
                            label="Ingresos"
                            valor={pesos(datos.totalIngresos)}
                            detalle={datos.cantIngresos
                                ? `${datos.cantIngresos} ${datos.cantIngresos === 1 ? "cobro" : "cobros"} · promedio ${pesos(datos.totalIngresos / datos.cantIngresos)}`
                                : `Nada en ${nombrePeriodo}`}
                            icono={ArrowDownLeft}
                            tono={TONO.ingreso}
                            brillo={BRILLO.ingreso}
                            delay={0}
                        />
                        <Indicador
                            label="Egresos"
                            valor={pesos(datos.totalEgresos)}
                            detalle={datos.cantEgresos
                                ? `${datos.cantEgresos} ${datos.cantEgresos === 1 ? "pago" : "pagos"} (compras y gastos)`
                                : `Nada en ${nombrePeriodo}`}
                            icono={ArrowUpRight}
                            tono={TONO.egreso}
                            brillo={BRILLO.egreso}
                            delay={50}
                        />
                        <Indicador
                            label="Ganancia de lo vendido"
                            valor={pesos(datos.ganancia)}
                            detalle={margen !== null
                                ? `${margen}% sobre el costo · ${datos.cantVentas} ${datos.cantVentas === 1 ? "venta" : "ventas"}`
                                : datos.cantVentas ? "Los productos vendidos no tienen costo cargado" : `Sin ventas en ${nombrePeriodo}`}
                            icono={Coins}
                            tono={TONO.marca}
                            brillo={BRILLO.marca}
                            delay={100}
                        />
                        <Indicador
                            label="Por cobrar"
                            valor={pesos(datos.porCobrar)}
                            detalle={datos.cantPendientes
                                ? `${datos.cantPendientes} ${datos.cantPendientes === 1 ? "pedido sin cobrar" : "pedidos sin cobrar"} (al día de hoy)`
                                : "Todo cobrado"}
                            icono={Clock}
                            tono={TONO.arena}
                            brillo={BRILLO.arena}
                            delay={150}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                        {/* Plata en caja: la cifra principal y cómo fue cambiando */}
                        <Tarjeta
                            titulo="Plata en caja"
                            subtitulo="Todo lo que entró menos todo lo que salió, desde que se usa el sistema"
                            icono={Wallet}
                            tono={TONO.marca}
                            className="lg:col-span-2"
                            delay={150}
                            acciones={<BotonTabla activo={!!tablas.saldo} onClick={() => alternarTabla("saldo")} />}
                        >
                            <div className="flex flex-wrap items-end gap-x-8 gap-y-2 mb-5">
                                <p className="text-5xl md:text-[56px] leading-none font-semibold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA]">
                                    {pesos(datos.saldo)}
                                </p>
                                <div className="flex gap-5 pb-1 text-sm">
                                    <span className="inline-flex items-center gap-1.5 text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">
                                        <span className="w-2 h-2 rounded-full bg-[var(--serie-ingreso)]" />
                                        Entró <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(datos.entroTotal)}</strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">
                                        <span className="w-2 h-2 rounded-full bg-[var(--serie-egreso)]" />
                                        Salió <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(datos.salioTotal)}</strong>
                                    </span>
                                </div>
                            </div>
                            {datos.saldo < 0 && (
                                <p className="mb-4 inline-flex items-start gap-2 text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-lg px-3 py-2">
                                    <Info className="w-4 h-4 shrink-0 text-[#7D9878] dark:text-[#A3B69B]" />
                                    Por ahora se invirtió más de lo que se vendió. Parte de esa plata está en la mercadería en stock (a la derecha).
                                </p>
                            )}

                            {tablas.saldo ? (
                                <TablaSimple
                                    columnas={["Fecha", "Plata en caja"]}
                                    filas={datos.puntosSaldo.slice(1, -1).reverse().slice(0, 10).map(p => [fechaCorta(p.t), pesos(p.saldo)])}
                                />
                            ) : datos.movsEnPeriodo === 0 ? (
                                <SinDatos texto={`Sin movimientos en ${nombrePeriodo}: la caja se mantuvo en ${pesos(datos.saldo)}`} />
                            ) : (
                                <div className="h-[220px] -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={datos.puntosSaldo} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                            <defs>
                                                <linearGradient id="saldo-trazo" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset={corteCero} stopColor="var(--serie-ingreso)" />
                                                    <stop offset={corteCero} stopColor="var(--serie-egreso)" />
                                                </linearGradient>
                                                <linearGradient id="saldo-relleno" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset={corteCero} stopColor="var(--serie-ingreso)" stopOpacity={0.14} />
                                                    <stop offset={corteCero} stopColor="var(--serie-egreso)" stopOpacity={0.14} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke="var(--grilla)" />
                                            <XAxis
                                                dataKey="t"
                                                type="number"
                                                scale="time"
                                                domain={[datos.inicio.getTime(), datos.hoy.getTime()]}
                                                tickFormatter={fechaCorta}
                                                tick={{ fontSize: 11, fill: "var(--tinta-2)" }}
                                                axisLine={{ stroke: "var(--eje)" }}
                                                tickLine={false}
                                                minTickGap={40}
                                            />
                                            <YAxis
                                                domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
                                                tickFormatter={pesosCorto}
                                                tick={{ fontSize: 11, fill: "var(--tinta-2)" }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={64}
                                            />
                                            <ReferenceLine y={0} stroke="var(--eje)" />
                                            <Tooltip
                                                cursor={{ stroke: "var(--eje)" }}
                                                content={<Globo titulo={(t: number) => new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} />}
                                            />
                                            <Area
                                                type="stepAfter"
                                                dataKey="saldo"
                                                name="en caja"
                                                stroke="url(#saldo-trazo)"
                                                strokeWidth={2}
                                                fill="url(#saldo-relleno)"
                                                baseValue={0}
                                                color={datos.saldo >= 0 ? "var(--serie-ingreso)" : "var(--serie-egreso)"}
                                                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--superficie)" }}
                                                animationDuration={700}
                                                animationEasing="ease-out"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Tarjeta>

                        {/* Mercadería en stock */}
                        <Tarjeta
                            titulo="Mercadería en stock"
                            subtitulo="Esencias e insumos que tenés, valuados al costo"
                            icono={Package}
                            tono={TONO.arena}
                            delay={200}
                        >
                            <p className="text-[40px] leading-none font-semibold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA]">
                                {pesos(datos.valorStock)}
                            </p>
                            <div className="mt-6 space-y-4">
                                {[
                                    { label: "Insumos", valor: datos.valorInsumos, detalle: "frascos, alcohol, etiquetas" },
                                    { label: "Esencias", valor: datos.valorEsencias, detalle: "según el precio cada 100 g" },
                                ].map(f => {
                                    const parte = datos.valorStock > 0 ? f.valor / datos.valorStock : 0;
                                    return (
                                        <div key={f.label}>
                                            <div className="flex items-baseline justify-between gap-2 text-sm">
                                                <span className="font-medium text-[#2C2C2C] dark:text-[#F4EFEA]">{f.label}</span>
                                                <span className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(f.valor)}</span>
                                            </div>
                                            <div className="mt-1.5 h-2 rounded-full bg-[#7D9878]/15 dark:bg-[#A3B69B]/15 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.round(parte * 100)}%` }}
                                                    transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
                                                    className="h-full rounded-full bg-[#7D9878] dark:bg-[#A3B69B]"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{Math.round(parte * 100)}% · {f.detalle}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-auto pt-5">
                                <div className="rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] px-4 py-3">
                                    <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Caja + mercadería</p>
                                    <p className="text-xl font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] mt-0.5">{pesos(datos.saldo + datos.valorStock)}</p>
                                </div>
                            </div>
                        </Tarjeta>

                        {/* Ingresos y egresos por mes */}
                        <Tarjeta
                            titulo={periodo === "mes" ? "Ingresos y egresos por semana" : "Ingresos y egresos por mes"}
                            subtitulo={`Movimientos de Caja de ${nombrePeriodo}`}
                            icono={BarChart3}
                            tono={TONO.ingreso}
                            className="lg:col-span-2"
                            delay={250}
                            acciones={<BotonTabla activo={!!tablas.meses} onClick={() => alternarTabla("meses")} />}
                        >
                            {!datos.hayMovimientos ? (
                                <SinDatos />
                            ) : tablas.meses ? (
                                <TablaSimple
                                    columnas={[periodo === "mes" ? "Días" : "Mes", "Ingresos", "Egresos", "Diferencia"]}
                                    filas={datos.grupos.map(g => [g.etiqueta, pesos(g.Ingresos), pesos(g.Egresos), pesos(g.Ingresos - g.Egresos)])}
                                />
                            ) : (
                                <>
                                    <Leyenda items={[{ color: "var(--serie-ingreso)", label: "Ingresos" }, { color: "var(--serie-egreso)", label: "Egresos" }]} />
                                    <div className="h-[260px] -ml-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={datos.grupos} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                                <CartesianGrid vertical={false} stroke="var(--grilla)" />
                                                <XAxis
                                                    dataKey="etiqueta"
                                                    tick={{ fontSize: 11, fill: "var(--tinta-2)" }}
                                                    axisLine={{ stroke: "var(--eje)" }}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    tickFormatter={pesosCorto}
                                                    tick={{ fontSize: 11, fill: "var(--tinta-2)" }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={64}
                                                />
                                                <Tooltip cursor={{ fill: "var(--cursor)" }} content={<Globo />} />
                                                <Bar dataKey="Ingresos" name="Ingresos" fill="var(--serie-ingreso)" color="var(--serie-ingreso)" maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
                                                <Bar dataKey="Egresos" name="Egresos" fill="var(--serie-egreso)" color="var(--serie-egreso)" maxBarSize={24} radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}
                        </Tarjeta>

                        {/* Cómo te pagan */}
                        <Tarjeta
                            titulo="Cómo te pagan"
                            subtitulo={`Ventas cobradas de ${nombrePeriodo}`}
                            icono={Coins}
                            tono={TONO.ingreso}
                            delay={300}
                        >
                            {datos.medios.length === 0 ? (
                                <SinDatos texto="Sin ventas cobradas en este período" />
                            ) : (
                                <ul className="space-y-4">
                                    {datos.medios.map(m => (
                                        <li key={m.label}>
                                            <div className="flex items-baseline justify-between gap-2 text-sm">
                                                <span className="font-medium text-[#2C2C2C] dark:text-[#F4EFEA]">{m.label}</span>
                                                <span className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(m.total)}</span>
                                            </div>
                                            <div className="mt-1.5 h-2 rounded-full bg-[var(--serie-ingreso)]/15 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.round(m.parte * 100)}%` }}
                                                    transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.25 }}
                                                    className="h-full rounded-full bg-[var(--serie-ingreso)]"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{Math.round(m.parte * 100)}% de lo cobrado</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Tarjeta>

                        {/* Productos más vendidos */}
                        <Tarjeta
                            titulo="Productos más vendidos"
                            subtitulo={`Los 5 que más facturaron en ${nombrePeriodo}`}
                            icono={Package}
                            tono={TONO.ingreso}
                            delay={350}
                            acciones={datos.topProductos.length > 0 ? <BotonTabla activo={!!tablas.productos} onClick={() => alternarTabla("productos")} /> : undefined}
                        >
                            {datos.topProductos.length === 0 ? (
                                <SinDatos texto="Sin ventas cobradas en este período" />
                            ) : tablas.productos ? (
                                <TablaSimple
                                    columnas={["Producto", "Unid.", "Total"]}
                                    filas={datos.topProductos.map(p => [p.nombre, p.unidades, pesos(p.total)])}
                                />
                            ) : (
                                <ul className="space-y-3.5">
                                    {datos.topProductos.map((p, i) => {
                                        const parte = datos.topProductos[0].total > 0 ? p.total / datos.topProductos[0].total : 0;
                                        return (
                                            <li key={p.nombre} title={p.nombre}>
                                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{p.nombre}</span>
                                                    <span className="shrink-0 font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                        {pesos(p.total)} <span className="font-normal text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">· {p.unidades} u.</span>
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-2 rounded-full bg-[var(--serie-ingreso)]/15 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.max(3, Math.round(parte * 100))}%` }}
                                                        transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.25 + i * 0.05 }}
                                                        className="h-full rounded-full bg-[var(--serie-ingreso)]"
                                                    />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Tarjeta>

                        {/* Últimos movimientos */}
                        <Tarjeta
                            titulo="Últimos movimientos"
                            subtitulo={`Lo más reciente de la Caja en ${nombrePeriodo}`}
                            icono={Wallet}
                            tono={TONO.marca}
                            className="lg:col-span-2"
                            delay={400}
                            acciones={
                                <Link
                                    href="/caja"
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] transition-colors duration-150"
                                >
                                    Ver Caja <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            }
                        >
                            {datos.ultimos.length === 0 ? (
                                <SinDatos />
                            ) : (
                                <ul className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 -my-2">
                                    {datos.ultimos.map(t => {
                                        const entra = t.type === "Ingreso";
                                        return (
                                            <li key={t.id} className="flex items-center gap-3 py-2.5">
                                                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${entra ? TONO.ingreso : TONO.egreso}`}>
                                                    {entra ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate" title={t.description}>{t.description}</p>
                                                    <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                                        {t.fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long" })} · {entra ? "Ingreso" : "Egreso"}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                    {entra ? "+" : "−"}{pesos(t.monto)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Tarjeta>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
