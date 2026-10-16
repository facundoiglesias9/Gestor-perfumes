"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Trash2, Loader2, Check, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Buscador from "@/components/Buscador";
import EncabezadoPagina, { BOTON_ENC } from "@/components/EncabezadoPagina";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useAppContext, type Transaccion } from "@/context/AppContext";
import { formatCurrency } from "@/lib/format-utils";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, PieVentana, ETIQUETA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { upsertRecord, deleteRecord } from "@/lib/db-actions";

type Tipo = "Ingreso" | "Egreso";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const formatARS = (n: number) => formatCurrency(n, true);

// Mismos colores que el Resumen: verde agua entra, naranja sale
const TONO: Record<Tipo, { chip: string; texto: string; boton: string; pastilla: string; anillo: string }> = {
    Ingreso: {
        chip: "bg-[#1baf7a]/12 text-[#128a5f] dark:bg-[#199e70]/20 dark:text-[#4fd1a0]",
        texto: "text-[#128a5f] dark:text-[#4fd1a0]",
        boton: "bg-[#169468] hover:bg-[#128a5f] shadow-[#1baf7a]/25",
        pastilla: "bg-white dark:bg-[#2B3A33] ring-[#1baf7a]/40",
        anillo: "text-[#1baf7a] dark:text-[#4fd1a0]",
    },
    Egreso: {
        chip: "bg-[#eb6834]/12 text-[#c4501f] dark:bg-[#d95926]/20 dark:text-[#f2895c]",
        texto: "text-[#c4501f] dark:text-[#f2895c]",
        boton: "bg-[#d65a28] hover:bg-[#c4501f] shadow-[#eb6834]/25",
        pastilla: "bg-white dark:bg-[#3A2F2A] ring-[#eb6834]/40",
        anillo: "text-[#eb6834] dark:text-[#f2895c]",
    },
};

// Número que, cuando cambia, cuenta desde el valor anterior hasta el nuevo
function NumeroAnimado({ valor, desde, formato = formatARS, duracion = 0.9 }: {
    valor: number; desde?: number; formato?: (n: number) => string; duracion?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const anterior = useRef(desde ?? valor);
    const reducir = useReducedMotion();
    // El texto lo maneja el efecto (React no lo pisa en cada render)
    const [inicial] = useState(() => formato(desde ?? valor));

    useEffect(() => {
        const de = anterior.current;
        anterior.current = valor;
        const el = ref.current;
        if (!el) return;
        if (de === valor || reducir) {
            el.textContent = formato(valor);
            return;
        }
        const controles = animate(de, valor, {
            duration: duracion,
            ease: EASE_OUT,
            onUpdate: (v) => { el.textContent = formato(v); },
        });
        return () => controles.stop();
    }, [valor]);

    return <span ref={ref} className="tabular-nums">{inicial}</span>;
}

// Tilde que se dibuja solo (círculo y después el check)
function TildeAnimado({ tipo }: { tipo: Tipo }) {
    return (
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${TONO[tipo].chip}`}>
            <svg viewBox="0 0 52 52" className={`w-14 h-14 ${TONO[tipo].anillo}`} aria-hidden>
                <motion.circle
                    cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    initial={{ pathLength: 0, rotate: -90 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    style={{ originX: "50%", originY: "50%" }}
                />
                <motion.path
                    d="M16 27.5 L23 34 L37 19" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35, delay: 0.35, ease: EASE_OUT }}
                />
            </svg>
        </div>
    );
}

type Burbuja = { id: string; tipo: Tipo; monto: number };

export default function CajaPage() {
    const { transacciones, setTransacciones, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [guardado, setGuardado] = useState<Transaccion | null>(null);
    const [filaNueva, setFilaNueva] = useState<string | null>(null);
    const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
    const cierreAutomatico = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [formData, setFormData] = useState({
        type: "Ingreso" as Tipo,
        amount: "",
        description: ""
    });

    // Cálculos de saldo - Aseguramos que sean números
    const totalIngresos = transacciones
        .filter(t => t.type === "Ingreso")
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const totalEgresos = transacciones
        .filter(t => t.type === "Egreso")
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const saldoActual = totalIngresos - totalEgresos;

    // Mientras la ventana está abierta los números de atrás quedan quietos; al cerrarla
    // cuentan hasta el valor nuevo (así la animación se ve, y no queda tapada).
    const [mostrados, setMostrados] = useState({ saldo: saldoActual, ingresos: totalIngresos, egresos: totalEgresos });
    useEffect(() => {
        if (!isAddModalOpen) setMostrados({ saldo: saldoActual, ingresos: totalIngresos, egresos: totalEgresos });
    }, [isAddModalOpen, saldoActual, totalIngresos, totalEgresos]);

    useEffect(() => () => { if (cierreAutomatico.current) clearTimeout(cierreAutomatico.current); }, []);

    const abrirModal = () => {
        setGuardado(null);
        setFormData({ type: "Ingreso", amount: "", description: "" });
        setIsAddModalOpen(true);
    };

    const cerrarModal = () => {
        if (cierreAutomatico.current) clearTimeout(cierreAutomatico.current);
        setIsAddModalOpen(false);
        if (guardado) {
            // Se ve después de que la ventana se va: fila resaltada y globito con el monto
            const g = guardado;
            setTimeout(() => {
                setFilaNueva(g.id);
                const b: Burbuja = { id: `${g.id}-${Date.now()}`, tipo: g.type, monto: Number(g.amount) };
                setBurbujas(prev => [...prev, b]);
                setTimeout(() => setBurbujas(prev => prev.filter(x => x.id !== b.id)), 2200);
            }, 120);
        }
    };

    // El cierre automático tiene que usar la versión más nueva de cerrarModal (con "guardado" ya cargado)
    const cerrarModalRef = useRef(cerrarModal);
    useEffect(() => { cerrarModalRef.current = cerrarModal; });

    const handleAddSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(formData.amount);
        if (!(monto > 0) || !formData.description.trim() || guardando) return;

        const newTransaction: Transaccion = {
            id: getNextId(transacciones, "T-"),
            type: formData.type,
            amount: monto,
            description: formData.description.trim(),
            date: new Date().toLocaleDateString("es-AR")
        };

        setGuardando(true);
        const { error } = await upsertRecord("transacciones", {
            id: newTransaction.id,
            type: newTransaction.type,
            amount: newTransaction.amount,
            description: newTransaction.description,
            date: newTransaction.date
        });
        setGuardando(false);
        if (error) {
            toast.error("No se pudo guardar el movimiento", { description: "Revisá la conexión y probá de nuevo." });
            return;
        }

        setTransacciones([newTransaction, ...transacciones]);
        setGuardado(newTransaction);
        cierreAutomatico.current = setTimeout(() => cerrarModalRef.current(), 1700);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setTransacciones(transacciones.filter(t => t.id !== itemToDelete));
            deleteRecord("transacciones", itemToDelete);
            setItemToDelete(null);
        }
    };

    const tono = TONO[formData.type];
    const montoValido = parseFloat(formData.amount) > 0;

    // Historial: filtro por tipo y búsqueda por descripción
    const [verTipo, setVerTipo] = useState<"Todos" | Tipo>("Todos");
    const [busqueda, setBusqueda] = useState("");
    const cantidad = { Todos: transacciones.length, Ingreso: transacciones.filter(t => t.type === "Ingreso").length, Egreso: transacciones.filter(t => t.type === "Egreso").length };
    const listado = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return transacciones.filter(t =>
            (verTipo === "Todos" || t.type === verTipo) &&
            (!q || (t.description || "").toLowerCase().includes(q) || (t.date || "").includes(q)));
    }, [transacciones, verTipo, busqueda]);
    // Proporción de lo que entró contra lo que salió (barra del saldo)
    const parteIngresos = totalIngresos + totalEgresos > 0 ? totalIngresos / (totalIngresos + totalEgresos) : 0.5;

    return (
        <div className="space-y-5 pb-12 relative">
            <EncabezadoPagina icono={Wallet} titulo="Caja" descripcion="Saldo, ingresos y gastos del negocio.">
                <button onClick={abrirModal} className={BOTON_ENC}>
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Nuevo movimiento
                </button>
            </EncabezadoPagina>

            {/* Números */}
            <div className="anim-entrada [animation-delay:60ms] grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Saldo */}
                <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 bg-white dark:bg-[#242723] bg-gradient-to-br from-[#7D9878]/[0.12] via-transparent to-transparent dark:from-[#A3B69B]/[0.10] border border-[#7D9878]/35 dark:border-[#A3B69B]/25 text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm">
                    <AnimatePresence>
                        {burbujas.map(b => (
                            <motion.div
                                key={`brillo-${b.id}`}
                                aria-hidden
                                className="absolute inset-0 bg-[#7D9878] pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.12, 0], transition: { duration: 0.9, ease: EASE_OUT } }}
                                exit={{ opacity: 0 }}
                            />
                        ))}
                    </AnimatePresence>
                    <div className="relative flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Saldo en caja</p>
                        <Wallet className="w-4 h-4 text-[#5A7356] dark:text-[#A3B69B]" />
                    </div>
                    <div className="relative mt-2">
                        <p className={`text-3xl md:text-[34px] font-bold tracking-tight ${mostrados.saldo < 0 ? "text-[#c4501f] dark:text-[#f2895c]" : ""}`}>
                            <NumeroAnimado valor={mostrados.saldo} />
                        </p>
                        {/* Globito con lo que entró o salió */}
                        <div className="absolute right-0 -top-9 h-8">
                            <AnimatePresence>
                                {burbujas.map(b => (
                                    <motion.span
                                        key={b.id}
                                        className="absolute right-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-sm font-bold shadow-lg shadow-black/15"
                                        initial={{ opacity: 0, transform: "translateY(14px) scale(0.95)" }}
                                        animate={{ opacity: 1, transform: "translateY(0px) scale(1)", transition: { type: "spring", duration: 0.5, bounce: 0.3 } }}
                                        exit={{ opacity: 0, transform: "translateY(-14px) scale(1)", transition: { duration: 0.35, ease: EASE_OUT } }}
                                    >
                                        {b.tipo === "Ingreso"
                                            ? <ArrowDownLeft className="w-4 h-4 text-[#128a5f]" />
                                            : <ArrowUpRight className="w-4 h-4 text-[#c4501f]" />}
                                        <span className="text-[#2C2C2C]">{b.tipo === "Ingreso" ? "+" : "−"}{formatARS(b.monto)}</span>
                                    </motion.span>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                    {/* Cuánto de lo movido fue ingreso y cuánto gasto */}
                    <div className="relative mt-4 flex h-1.5 rounded-full overflow-hidden bg-[#2C2C2C]/[0.06] dark:bg-white/[0.08]" aria-hidden>
                        <div className="bg-[#1baf7a]" style={{ width: `${parteIngresos * 100}%` }} />
                        <div className="bg-[#eb6834] flex-1" />
                    </div>
                    <p className="relative mt-2 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Ingresos menos egresos</p>
                </div>

                {([
                    { tipo: "Ingreso" as Tipo, titulo: "Ingresos", valor: mostrados.ingresos, Icono: ArrowDownLeft },
                    { tipo: "Egreso" as Tipo, titulo: "Egresos", valor: mostrados.egresos, Icono: ArrowUpRight },
                ]).map(c => (
                    <div key={c.tipo} className="rounded-2xl p-5 md:p-6 bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{c.titulo}</p>
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONO[c.tipo].chip}`}>
                                <c.Icono className="w-4 h-4" />
                            </span>
                        </div>
                        <p className={`mt-2 text-2xl md:text-[28px] font-bold tracking-tight ${TONO[c.tipo].texto}`}>
                            <NumeroAnimado valor={c.valor} />
                        </p>
                        <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                            {cantidad[c.tipo]} {cantidad[c.tipo] === 1 ? "movimiento" : "movimientos"}
                        </p>
                    </div>
                ))}
            </div>

            {/* Historial */}
            <section className="anim-entrada [animation-delay:120ms] bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] mr-auto">
                        <ReceiptText className="w-4 h-4 text-[#5A7356] dark:text-[#A3B69B]" />
                        Movimientos
                    </h2>
                    <div role="group" aria-label="Ver" className="flex gap-1 p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                        {(["Todos", "Ingreso", "Egreso"] as const).map(t => {
                            const activo = verTipo === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    aria-pressed={activo}
                                    onClick={() => setVerTipo(t)}
                                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 ${activo
                                        ? "bg-white dark:bg-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm"
                                        : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                >
                                    {t === "Todos" ? "Todos" : t === "Ingreso" ? "Ingresos" : "Egresos"}
                                    <span className="text-xs font-medium tabular-nums opacity-60">{cantidad[t]}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Buscador
                        valor={busqueda}
                        onCambiar={setBusqueda}
                        placeholder="Buscar movimiento…"
                        aria-label="Buscar movimiento"
                        fondo="crema"
                        className="w-full sm:w-64"
                    />
                </div>

                {listado.length === 0 ? (
                    <div className="py-14 px-6 flex flex-col items-center text-center gap-2">
                        <Wallet className="w-7 h-7 text-[#2C2C2C]/25 dark:text-[#F4EFEA]/20" />
                        <p className="text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                            {transacciones.length === 0 ? "Todavía no hay movimientos" : "No hay movimientos con ese filtro"}
                        </p>
                        <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                            {transacciones.length === 0 ? "Cargá un ingreso o un gasto con “Nuevo movimiento”." : "Probá con otra búsqueda."}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                        {listado.map((item, idx) => {
                            const nueva = item.id === filaNueva;
                            const tipo = (item.type === "Ingreso" ? "Ingreso" : "Egreso") as Tipo;
                            const Icono = tipo === "Ingreso" ? ArrowDownLeft : ArrowUpRight;
                            return (
                                <li
                                    key={item.id || idx}
                                    className={`group flex items-center gap-3 px-5 py-3 hover:bg-[#F9F6F0] dark:hover:bg-[#2A2E29] transition-colors duration-150 ${nueva ? tipo === "Ingreso" ? "fila-nueva-ingreso" : "fila-nueva-egreso" : ""}`}
                                >
                                    <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${TONO[tipo].chip}`} title={tipo}>
                                        <Icono className="w-4 h-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate" title={item.description}>{item.description}</p>
                                        <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{item.date} · {tipo}</p>
                                    </div>
                                    <p className={`text-[15px] font-semibold tabular-nums whitespace-nowrap ${TONO[tipo].texto}`}>
                                        {tipo === "Ingreso" ? "+" : "−"}{formatARS(Number(item.amount))}
                                    </p>
                                    <button
                                        onClick={() => setItemToDelete(item.id)}
                                        aria-label={`Eliminar ${item.description}`}
                                        title="Eliminar movimiento"
                                        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#2C2C2C]/35 dark:text-[#F4EFEA]/30 hover:text-[#c4501f] dark:hover:text-[#f2895c] hover:bg-[#eb6834]/10 active:scale-[0.94] transition-[background-color,color,transform] duration-150"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Movimiento"
                message="¿Estás seguro de que deseas eliminar este movimiento? Afectará al saldo disponible."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Ventana para cargar un movimiento */}
            <Ventana abierta={isAddModalOpen} onCerrar={guardando ? undefined : cerrarModal} cerrarAlTocarFondo={!!guardado} etiqueta="Cargar movimiento">
                <PanelVentana ancho="sm">
                    <AnimatePresence mode="wait" initial={false}>
                        {guardado ? (
                            // Confirmación: tilde que se dibuja y el monto contando
                            <motion.div
                                key="listo"
                                className="flex flex-col flex-1 min-h-0"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE_OUT } }}
                            >
                                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 pt-10 pb-8 flex flex-col items-center text-center">
                                    <TildeAnimado tipo={guardado.type} />
                                    <p className="mt-5 text-sm font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                                        {guardado.type === "Ingreso" ? "Ingreso guardado" : "Egreso guardado"}
                                    </p>
                                    <p className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${TONO[guardado.type].texto}`}>
                                        {guardado.type === "Ingreso" ? "+" : "−"}<NumeroAnimado valor={Number(guardado.amount)} desde={0} duracion={0.8} />
                                    </p>
                                    <p className="mt-2 text-sm text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 max-w-xs truncate">{guardado.description}</p>
                                </div>
                                <PieVentana className="justify-end">
                                    <button type="button" autoFocus onClick={cerrarModal} className={BOTON_SECUNDARIO}>
                                        Listo
                                    </button>
                                </PieVentana>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="formulario"
                                className="flex flex-col flex-1 min-h-0"
                                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                            >
                                <CabeceraVentana
                                    etiqueta="Caja"
                                    titulo="Cargar movimiento"
                                    descripcion="Un ingreso o un gasto que no sea una venta."
                                    icono={Wallet}
                                    onCerrar={cerrarModal}
                                    cerrarDeshabilitado={guardando}
                                />

                                <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 py-6 space-y-5">
                                        {/* Tipo: la pastilla se desliza de Ingreso a Egreso */}
                                        <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                                            {(["Ingreso", "Egreso"] as Tipo[]).map(t => {
                                                const activo = formData.type === t;
                                                const Icono = t === "Ingreso" ? ArrowDownLeft : ArrowUpRight;
                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={activo}
                                                        onClick={() => setFormData({ ...formData, type: t })}
                                                        className={`relative h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.98] ${activo ? TONO[t].texto : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                                    >
                                                        {activo && (
                                                            <motion.span
                                                                layoutId="caja-tipo"
                                                                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                                                className={`absolute inset-0 rounded-xl shadow-sm ring-1 ${TONO[t].pastilla}`}
                                                            />
                                                        )}
                                                        <span className="relative flex items-center gap-2">
                                                            <Icono className="w-4 h-4" /> {t}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <label className="block">
                                            <span className={ETIQUETA_CAMPO}>Monto</span>
                                            <span className="relative block">
                                                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold transition-colors duration-150 pointer-events-none ${montoValido ? tono.texto : "text-[#2C2C2C]/30 dark:text-[#F4EFEA]/30"}`}>$</span>
                                                <input
                                                    required
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0"
                                                    step="any"
                                                    autoFocus
                                                    value={formData.amount}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                    placeholder="0"
                                                    className={`${CAMPO.replace("h-11", "h-16").replace("text-sm", "text-3xl")} pl-11 font-semibold tracking-tight tabular-nums`}
                                                />
                                            </span>
                                        </label>

                                        <label className="block">
                                            <span className={ETIQUETA_CAMPO}>Descripción</span>
                                            <input
                                                required
                                                type="text"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder={formData.type === "Ingreso" ? "Ej: Venta en la feria" : "Ej: Compra de frascos"}
                                                className={CAMPO}
                                            />
                                        </label>
                                    </div>

                                    <PieVentana>
                                        <button type="button" onClick={cerrarModal} disabled={guardando} className={BOTON_SECUNDARIO}>
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!montoValido || !formData.description.trim() || guardando}
                                            className={`${BOTON_PRINCIPAL.replace("bg-[#7D9878] ", "").replace("shadow-[#7D9878]/25 hover:bg-[#6B8566] ", "")} ${tono.boton}`}
                                        >
                                            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                                            {guardando ? "Guardando…" : formData.type === "Ingreso" ? "Guardar ingreso" : "Guardar egreso"}
                                        </button>
                                    </PieVentana>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </PanelVentana>
            </Ventana>
        </div>
    );
}
