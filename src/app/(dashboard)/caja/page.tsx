"use client";

import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Plus, Trash2, X, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useAppContext, type Transaccion } from "@/context/AppContext";
import { formatCurrency } from "@/lib/format-utils";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";
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

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-300 relative">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase mb-1 border border-[#7D9878]/20">
                        <Wallet className="w-3.5 h-3.5" />
                        Monetización
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand text-center">
                        Caja Unificada
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg max-w-xl leading-relaxed font-medium transition-colors text-center">
                        Controlá el saldo, ingresos por ventas manuales y los egresos por compras.
                    </p>
                </div>

                <div className="mt-6 md:mt-0 md:absolute md:right-10 md:top-1/2 md:-translate-y-1/2">
                    <button
                        onClick={abrirModal}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] text-white font-bold hover:bg-[#6b8566] hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-[0.97] transition-[background-color,box-shadow,transform] duration-150 font-brand"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Movimiento Manual
                    </button>
                </div>
            </header>

            {/* Widgets de Saldo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gradient-to-br from-[#7D9878] to-[#5a7356] dark:from-[#353B33] dark:to-[#242723] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#7D9878]/20 relative overflow-hidden flex flex-col justify-between min-h-[220px] border border-[#7D9878]/30">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="w-32 h-32" />
                    </div>
                    {/* Destello cuando cambia el saldo */}
                    <AnimatePresence>
                        {burbujas.map(b => (
                            <motion.div
                                key={`brillo-${b.id}`}
                                aria-hidden
                                className="absolute inset-0 bg-white pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.18, 0], transition: { duration: 0.9, ease: "easeOut" } }}
                                exit={{ opacity: 0 }}
                            />
                        ))}
                    </AnimatePresence>
                    <div className="relative z-10 flex items-center gap-3 font-semibold text-white/90">
                        Plata en Caja
                    </div>
                    <div className="relative z-10 mt-4">
                        <span className="text-5xl font-black tracking-tight"><NumeroAnimado valor={mostrados.saldo} /></span>
                        {/* Globito con lo que entró o salió */}
                        <div className="absolute left-0 -top-10 h-8">
                            <AnimatePresence>
                                {burbujas.map(b => (
                                    <motion.span
                                        key={b.id}
                                        className="absolute left-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-sm font-bold shadow-lg shadow-black/15"
                                        initial={{ opacity: 0, y: 14, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", duration: 0.5, bounce: 0.3 } }}
                                        exit={{ opacity: 0, y: -14, transition: { duration: 0.35, ease: "easeOut" } }}
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
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-[#7D9878] dark:text-[#A3B69B] font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-[#7D9878]/10 rounded-lg">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            Ingresos Totales
                        </div>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA]"><NumeroAnimado valor={mostrados.ingresos} /></p>
                    </div>

                    <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-[#C9866F] font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-[#C9866F]/10 rounded-lg">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            Egresos Totales
                        </div>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA]"><NumeroAnimado valor={mostrados.egresos} /></p>
                    </div>
                </div>
            </div>

            {/* Listado de Transacciones */}
            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-sm overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2">
                        Historial de Movimientos
                    </h2>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[15%]">Fecha</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[15%]">Tipo</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[40%]">Descripción</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[20%] text-right">Monto</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                            {transacciones.map((item, idx) => {
                                const nueva = item.id === filaNueva;
                                return (
                                    <tr
                                        key={item.id || idx}
                                        className={`group hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10 transition-colors ${nueva ? item.type === "Ingreso" ? "fila-nueva-ingreso" : "fila-nueva-egreso" : ""}`}
                                    >
                                        <td className="px-8 py-6">
                                            <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 font-medium text-sm">{item.date}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider border ${item.type === "Ingreso"
                                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                                : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                                }`}>
                                                {item.type === "Ingreso" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-semibold">{item.description}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className={`font-black text-lg ${item.type === "Ingreso" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
                                                }`}>
                                                {item.type === "Ingreso" ? "+" : "-"}{formatARS(item.amount)}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => setItemToDelete(item.id)}
                                                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors active:scale-[0.94]"
                                                title="Eliminar registro"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {transacciones.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-20 h-20 mb-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Wallet className="w-8 h-8 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">No hay movimientos en la caja. Comenzá a cargar ingresos y compras.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Movimiento"
                message="¿Estás seguro de que deseas eliminar este movimiento? Afectará al saldo disponible."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Ventana para cargar un movimiento */}
            <Ventana abierta={isAddModalOpen} onCerrar={guardando ? undefined : cerrarModal} cerrarAlTocarFondo={!!guardado} etiqueta="Cargar movimiento">
                <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33]">
                    <AnimatePresence mode="wait" initial={false}>
                        {guardado ? (
                            // Confirmación: tilde que se dibuja y el monto contando
                            <motion.div
                                key="listo"
                                className="px-8 pt-10 pb-8 flex flex-col items-center text-center"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE_OUT } }}
                            >
                                <TildeAnimado tipo={guardado.type} />
                                <p className="mt-5 text-sm font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                                    {guardado.type === "Ingreso" ? "Ingreso guardado" : "Egreso guardado"}
                                </p>
                                <p className={`mt-1 text-4xl font-black tracking-tight ${TONO[guardado.type].texto}`}>
                                    {guardado.type === "Ingreso" ? "+" : "−"}<NumeroAnimado valor={Number(guardado.amount)} desde={0} duracion={0.8} />
                                </p>
                                <p className="mt-2 text-sm text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 max-w-xs truncate">{guardado.description}</p>
                                <button
                                    onClick={cerrarModal}
                                    className="mt-7 h-10 px-5 rounded-xl text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.97] transition-[background-color,transform] duration-150"
                                >
                                    Listo
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="formulario"
                                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                            >
                                <div className="px-6 sm:px-7 pt-6 pb-5 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-start gap-4 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Cargar Movimiento</h2>
                                        <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-1">Registrá un ingreso o un gasto que no sea una venta.</p>
                                    </div>
                                    <button
                                        onClick={cerrarModal}
                                        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#E6DFD5]/70 dark:hover:bg-[#353B33] active:scale-[0.94] transition-[background-color,color,transform] duration-150"
                                        aria-label="Cerrar"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddSubmit} className="p-6 sm:p-7 space-y-5">
                                    {/* Tipo: la pastilla se desliza de Ingreso a Egreso */}
                                    <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33]">
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
                                                    className={`relative h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.98] ${activo ? TONO[t].texto : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
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

                                    <div>
                                        <label htmlFor="caja-monto" className="block text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 mb-1.5">Monto</label>
                                        <div className="relative">
                                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black transition-colors duration-150 ${montoValido ? tono.texto : "text-[#2C2C2C]/30 dark:text-[#F4EFEA]/30"}`}>$</span>
                                            <input
                                                id="caja-monto"
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
                                                className="w-full h-16 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl pl-11 pr-4 text-3xl font-black tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/25 dark:placeholder:text-[#F4EFEA]/25 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="caja-descripcion" className="block text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 mb-1.5">Descripción</label>
                                        <input
                                            id="caja-descripcion"
                                            required
                                            type="text"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder={formData.type === "Ingreso" ? "Ej: Venta en la feria" : "Ej: Compra de frascos"}
                                            className="w-full h-12 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl px-4 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F4EFEA]/35 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150 font-semibold"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!montoValido || !formData.description.trim() || guardando}
                                        className={`w-full h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-[background-color,transform,opacity] duration-150 ${tono.boton}`}
                                    >
                                        {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                                        {guardando ? "Guardando…" : formData.type === "Ingreso" ? "Guardar ingreso" : "Guardar egreso"}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Ventana>
        </div>
    );
}
