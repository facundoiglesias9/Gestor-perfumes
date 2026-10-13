"use client";

import { ShoppingCart, Plus, Minus, Package, Search, X, FlaskConical, Check, Wallet, Boxes, ReceiptText, ArrowRight } from "lucide-react";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, type Variants } from "framer-motion";
import { toast } from "sonner";
import { useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CAMPO, ETIQUETA_CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { Selector } from "@/components/Desplegable";
import Buscador from "@/components/Buscador";
import { formatNumber } from "@/lib/format-utils";

type ItemPedido = {
    cartId: string;
    type: "Esencia" | "Insumo";
    item_id: string;
    name: string;
    category: string;
    bultosToBuy: number;
    bultoQty: number;
    bultoCost: number;
    unit: string;
};

type Confirmada = { total: number; productos: number; bultos: number };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const pesos = (n: number) => `$${formatNumber(n)}`;

const TARJETA = "bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm";

// Filas del pedido: la fila entera se desvanece y su contenido baja apenas al entrar.
// Están separadas porque la fila también se reacomoda (layout) cuando se quita otra.
const fila: Variants = {
    oculta: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
    salida: { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } },
};
const filaContenido: Variants = {
    oculta: { transform: "translateY(-6px)" },
    visible: { transform: "translateY(0px)", transition: { duration: 0.2, ease: EASE_OUT } },
    salida: { transform: "scale(0.98)", transition: { duration: 0.15, ease: EASE_OUT } },
};

// Contador de bultos con − y +
function Contador({ valor, onCambiar, chico, etiqueta = "Cantidad de bultos" }: {
    valor: number;
    onCambiar: (n: number) => void;
    chico?: boolean;
    etiqueta?: string;
}) {
    const boton = `${chico ? "w-8" : "w-10"} h-full flex items-center justify-center text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] active:scale-[0.9] disabled:opacity-30 disabled:pointer-events-none transition-[color,transform] duration-150`;
    return (
        <div className={`inline-flex items-center ${chico ? "h-9" : "h-11"} rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A]`}>
            <button type="button" onClick={() => onCambiar(Math.max(1, valor - 1))} disabled={valor <= 1} aria-label="Un bulto menos" className={boton}>
                <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <input
                type="number"
                inputMode="numeric"
                min={1}
                value={valor}
                aria-label={etiqueta}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onCambiar(Math.max(1, parseInt(e.target.value) || 1))}
                className={`${chico ? "w-8" : "w-10"} bg-transparent text-center text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
            <button type="button" onClick={() => onCambiar(valor + 1)} aria-label="Un bulto más" className={boton}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

// Sello de "compra confirmada": el círculo aparece con un rebote corto, el tilde se dibuja
// y unas chispas con los colores de la marca salen hacia afuera una sola vez.
const CHISPAS = Array.from({ length: 10 }, (_, i) => {
    const angulo = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const distancia = i % 2 === 0 ? 58 : 46;
    return {
        x: Math.round(Math.cos(angulo) * distancia),
        y: Math.round(Math.sin(angulo) * distancia),
        color: ["#7D9878", "#C9866F", "#A3B69B", "#DAC4AA"][i % 4],
    };
});

function SelloConfirmado() {
    const reducir = useReducedMotion();
    return (
        <div className="relative w-20 h-20 mx-auto" aria-hidden>
            {!reducir && CHISPAS.map((c, i) => (
                <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 -ml-1 -mt-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                    initial={{ opacity: 0, transform: "translate(0px, 0px) scale(0.6)" }}
                    animate={{ opacity: [0, 1, 0], transform: `translate(${c.x}px, ${c.y}px) scale(1)` }}
                    transition={{ duration: 0.7, delay: 0.22, ease: EASE_OUT }}
                />
            ))}
            {!reducir && (
                <motion.span
                    className="absolute inset-0 rounded-full border-2 border-[#7D9878]"
                    initial={{ opacity: 0.5, transform: "scale(1)" }}
                    animate={{ opacity: 0, transform: "scale(1.5)" }}
                    transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
                />
            )}
            <motion.div
                className="absolute inset-0 rounded-full bg-[#7D9878] shadow-lg shadow-[#7D9878]/30 flex items-center justify-center"
                initial={{ opacity: 0, transform: "scale(0.9)" }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.3 }}
            >
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                    <motion.path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        initial={{ pathLength: reducir ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.35, delay: 0.16, ease: EASE_OUT }}
                    />
                </svg>
            </motion.div>
        </div>
    );
}

export default function PedidosPage() {
    const { esencias, insumos, inventario, setInventario, transacciones, setTransacciones, getNextId, categorias, proveedores, generos } = useAppContext();

    const [cart, setCart] = useState<ItemPedido[]>([]);
    const [tipo, setTipo] = useState<"Esencia" | "Insumo">("Esencia");
    const [insumoId, setInsumoId] = useState("");
    const [bultosInsumo, setBultosInsumo] = useState(1);
    const [confirmada, setConfirmada] = useState<Confirmada | null>(null);

    const [isEsenciaModalOpen, setIsEsenciaModalOpen] = useState(false);
    const [esenciaSearch, setEsenciaSearch] = useState("");
    const [esenciaTab, setEsenciaTab] = useState<"Perfumería" | "Limpia Pisos">("Perfumería");
    const [esenciaGenderFilter, setEsenciaGenderFilter] = useState("Todos");
    const [esenciaProviderFilter, setEsenciaProviderFilter] = useState("Todos");
    const [esenciaCategoryFilter, setEsenciaCategoryFilter] = useState("Todos");

    const filteredEsencias = useMemo(() => {
        return esencias.filter(e => {
            const isLP = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
            if (esenciaTab === "Perfumería" && isLP) return false;
            if (esenciaTab === "Limpia Pisos" && !isLP) return false;
            const matchesSearch = e.name.toLowerCase().includes(esenciaSearch.toLowerCase());
            if (esenciaTab === "Limpia Pisos") {
                const matchesCat = esenciaCategoryFilter === "Todos" || e.category?.toLowerCase() === esenciaCategoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
            }
            const genderValue = e.gender || (e.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
            const matchesGender = esenciaGenderFilter === "Todos" || genderValue === esenciaGenderFilter;
            const matchesProvider = esenciaProviderFilter === "Todos" || e.provider === esenciaProviderFilter;
            return matchesSearch && matchesGender && matchesProvider;
        });
    }, [esencias, esenciaSearch, esenciaTab, esenciaGenderFilter, esenciaProviderFilter, esenciaCategoryFilter]);

    // Si el mismo producto (y la misma presentación) ya está en el pedido, suma bultos en vez de repetir la fila
    const agregar = (nuevo: Omit<ItemPedido, "cartId">) => {
        const igual = cart.find(c => c.item_id === nuevo.item_id && c.name === nuevo.name);
        if (igual) {
            const total = igual.bultosToBuy + nuevo.bultosToBuy;
            setCart(cart.map(c => c.cartId === igual.cartId ? { ...c, bultosToBuy: total } : c));
            toast.success(`${nuevo.name}: ahora ${total} bultos`);
            return;
        }
        setCart([...cart, { ...nuevo, cartId: `C-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
    };

    const agregarInsumo = (e: FormEvent) => {
        e.preventDefault();
        const insumo = insumos.find(i => i.id === insumoId);
        if (!insumo) return;
        agregar({
            type: "Insumo",
            item_id: insumo.id,
            name: insumo.name,
            category: insumo.category || "Perfumería Fina",
            bultosToBuy: bultosInsumo,
            bultoQty: insumo.qty,
            bultoCost: insumo.cost,
            unit: insumo.unit || "un.",
        });
        setInsumoId("");
        setBultosInsumo(1);
    };

    const handleSelectEsencia = (esencia: (typeof esencias)[number], weight: "30g" | "100g") => {
        const cost = weight === "30g" ? esencia.price30g : esencia.price100g;
        if (cost === "consultar" || !cost) {
            toast.error("Esta presentación no tiene precio cargado", { description: "Consultá el precio con el proveedor." });
            return;
        }
        agregar({
            type: "Esencia",
            item_id: esencia.id,
            name: `${esencia.name} (${weight})`,
            category: esencia.category || "Perfumería Fina",
            bultosToBuy: 1,
            bultoQty: weight === "30g" ? 30 : 100,
            bultoCost: cost as number,
            unit: "g",
        });
        setIsEsenciaModalOpen(false);
    };

    const cambiarBultos = (cartId: string, n: number) => setCart(cart.map(c => c.cartId === cartId ? { ...c, bultosToBuy: n } : c));
    const quitar = (cartId: string) => setCart(cart.filter(c => c.cartId !== cartId));

    const subtotal = (c: ItemPedido) => c.bultosToBuy * c.bultoCost;
    const cartTotal = cart.reduce((acc, c) => acc + subtotal(c), 0);
    const totalEsencias = cart.filter(c => c.type === "Esencia").reduce((acc, c) => acc + subtotal(c), 0);
    const totalInsumos = cartTotal - totalEsencias;
    const totalBultos = cart.reduce((acc, c) => acc + c.bultosToBuy, 0);

    const handleConfirmOrder = () => {
        if (cart.length === 0) return;

        const orderTotal = cartTotal;
        const descriptionItemNames = cart.map(c => c.name).join(", ");
        const description = `Pedido Mayorista: ${descriptionItemNames}`.substring(0, 100);

        setTransacciones([
            {
                id: getNextId(transacciones, "T-"),
                type: "Egreso",
                amount: orderTotal,
                description: description + (descriptionItemNames.length > 100 ? "..." : ""),
                date: new Date().toLocaleDateString("es-AR")
            },
            ...transacciones
        ]);

        const currentInv = [...inventario];
        cart.forEach(c => {
            currentInv.push({
                id: getNextId(currentInv, "INV-"),
                name: c.name,
                type: c.type,
                category: c.category,
                qty: c.bultosToBuy * c.bultoQty,
                lastUpdate: new Date().toLocaleDateString("es-AR"),
                unit: c.unit
            });
        });

        setInventario(currentInv);
        setConfirmada({ total: orderTotal, productos: cart.length, bultos: totalBultos });
        setCart([]);
    };

    return (
        <MotionConfig reducedMotion="user">
        <div className="space-y-6 pb-12">
            <EncabezadoPagina icono={ShoppingCart} titulo="Pedido mayorista" descripcion="Armá la compra a tus proveedores: el gasto sale de la caja y el stock entra al inventario." />

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 md:gap-6 items-start">
                <div className="space-y-4 md:space-y-6 min-w-0">
                    {/* Agregar */}
                    <section className={`anim-entrada [animation-delay:60ms] ${TARJETA} p-5 md:p-6`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]">
                                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                                </span>
                                Agregar al pedido
                            </h2>
                            <div role="tablist" aria-label="Qué agregar" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                                {(["Esencia", "Insumo"] as const).map(t => {
                                    const activo = tipo === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            role="tab"
                                            aria-selected={activo}
                                            onClick={() => setTipo(t)}
                                            className={`relative h-9 px-4 rounded-lg text-sm font-semibold transition-colors duration-150 ${activo ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                        >
                                            {activo && (
                                                <motion.span
                                                    layoutId="pedido-tipo"
                                                    transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#353B33] shadow-sm"
                                                />
                                            )}
                                            <span className="relative">{t === "Esencia" ? "Esencias" : "Insumos"}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4">
                            {tipo === "Esencia" ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEsenciaModalOpen(true)}
                                    className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[#7D9878]/40 bg-[#7D9878]/[0.04] hover:bg-[#7D9878]/[0.08] hover:border-[#7D9878]/70 active:scale-[0.99] text-left transition-[background-color,border-color,transform] duration-150"
                                >
                                    <span className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-[#5A7356] dark:text-[#A3B69B]">
                                        <FlaskConical className="w-[18px] h-[18px]" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Elegir esencia</span>
                                        <span className="block text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Buscala por nombre y tocá el precio de 30 g o 100 g.</span>
                                    </span>
                                    <Search className="w-4 h-4 shrink-0 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/35 group-hover:text-[#5A7356] dark:group-hover:text-[#A3B69B] transition-colors duration-150" />
                                </button>
                            ) : (
                                <form onSubmit={agregarInsumo} className="flex flex-col sm:flex-row sm:items-end gap-3">
                                    <div className="flex-1 min-w-0">
                                        <label className={ETIQUETA_CAMPO}>Insumo</label>
                                        <Selector aria-label="Insumo" value={insumoId} onChange={e => setInsumoId(e.target.value)} className={CAMPO}>
                                            <option value="" disabled>Elegí un insumo</option>
                                            {insumos.map(i => (
                                                <option key={i.id} value={i.id}>{i.name} — {pesos(i.cost)} por {i.qty} {i.unit}</option>
                                            ))}
                                        </Selector>
                                    </div>
                                    <div>
                                        <label className={ETIQUETA_CAMPO}>Bultos</label>
                                        <Contador valor={bultosInsumo} onCambiar={setBultosInsumo} />
                                    </div>
                                    <button type="submit" disabled={!insumoId} className={BOTON_PRINCIPAL}>
                                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                                        Agregar
                                    </button>
                                </form>
                            )}
                        </div>
                    </section>

                    {/* El pedido */}
                    <section className={`anim-entrada [animation-delay:120ms] ${TARJETA} p-5 md:p-6`}>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]">
                                    <ShoppingCart className="w-4 h-4" />
                                </span>
                                Tu pedido
                            </h2>
                            {cart.length > 0 && (
                                <span className="text-xs font-semibold tabular-nums text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                    {cart.length} {cart.length === 1 ? "producto" : "productos"} · {totalBultos} {totalBultos === 1 ? "bulto" : "bultos"}
                                </span>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-10 flex flex-col items-center text-center gap-2">
                                <ShoppingCart className="w-7 h-7 text-[#2C2C2C]/25 dark:text-[#F4EFEA]/20" />
                                <p className="text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">Todavía no agregaste nada</p>
                                <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Elegí esencias o insumos arriba y van a aparecer acá.</p>
                            </div>
                        ) : (
                            <ul className="mt-3 divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {cart.map(item => {
                                        const esEsencia = item.type === "Esencia";
                                        return (
                                            <motion.li
                                                key={item.cartId}
                                                layout="position"
                                                variants={fila}
                                                initial="oculta"
                                                animate="visible"
                                                exit="salida"
                                                transition={{ layout: { duration: 0.2, ease: EASE_OUT } }}
                                            >
                                                <motion.div variants={filaContenido} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                                                    <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${esEsencia
                                                        ? "bg-[#7D9878]/12 text-[#5A7356] dark:text-[#A3B69B]"
                                                        : "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]"}`}
                                                    >
                                                        {esEsencia ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                                    </span>
                                                    <div className="flex-1 min-w-[160px]">
                                                        <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{item.name}</p>
                                                        <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 truncate">
                                                            {esEsencia ? "Esencia" : "Insumo"} · bulto de {formatNumber(item.bultoQty)} {item.unit} a {pesos(item.bultoCost)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <Contador chico valor={item.bultosToBuy} onCambiar={n => cambiarBultos(item.cartId, n)} etiqueta={`Bultos de ${item.name}`} />
                                                        <p className="w-24 text-right text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(subtotal(item))}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => quitar(item.cartId)}
                                                            aria-label={`Quitar ${item.name}`}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/40 dark:text-[#F4EFEA]/35 hover:text-[#97604D] dark:hover:text-[#DBA793] hover:bg-[#C9866F]/10 active:scale-[0.92] transition-[background-color,color,transform] duration-150"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ul>
                        )}
                    </section>
                </div>

                {/* Resumen y confirmar */}
                <aside className={`anim-entrada [animation-delay:180ms] lg:sticky lg:top-24 ${TARJETA} p-5 md:p-6`}>
                    <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]">
                            <ReceiptText className="w-4 h-4" />
                        </span>
                        Resumen
                    </h2>

                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Esencias</dt>
                            <dd className="font-medium tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(totalEsencias)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Insumos</dt>
                            <dd className="font-medium tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(totalInsumos)}</dd>
                        </div>
                    </dl>

                    <div className="mt-4 pt-4 border-t border-[#E6DFD5] dark:border-[#353B33] flex items-end justify-between gap-3">
                        <span className="text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 pb-1">Total</span>
                        <motion.span
                            key={cartTotal}
                            initial={{ opacity: 0.35 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.18, ease: EASE_OUT }}
                            className="text-3xl font-bold tracking-tight tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]"
                        >
                            {pesos(cartTotal)}
                        </motion.span>
                    </div>

                    <ul className="mt-4 space-y-2 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] p-3 text-xs text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60">
                        <li className="flex items-start gap-2">
                            <Wallet className="w-3.5 h-3.5 mt-px shrink-0 text-[#97604D] dark:text-[#DBA793]" />
                            <span>Sale <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(cartTotal)}</strong> de la caja como egreso</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Boxes className="w-3.5 h-3.5 mt-px shrink-0 text-[#5A7356] dark:text-[#A3B69B]" />
                            <span>
                                Entran <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{cart.length} {cart.length === 1 ? "producto" : "productos"}</strong> al inventario
                            </span>
                        </li>
                    </ul>

                    <button
                        type="button"
                        onClick={handleConfirmOrder}
                        disabled={cart.length === 0}
                        className={`${BOTON_PRINCIPAL} w-full mt-5 h-12 text-[15px]`}
                    >
                        <Check className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        Confirmar compra
                    </button>
                </aside>
            </div>

            {/* Compra confirmada */}
            <Ventana abierta={confirmada !== null} onCerrar={() => setConfirmada(null)} etiqueta="Compra confirmada">
                {confirmada && (
                    <PanelVentana ancho="sm">
                        <div className="px-7 pt-9 pb-7 text-center">
                            <SelloConfirmado />
                            <motion.div
                                initial={{ opacity: 0, transform: "translateY(6px)" }}
                                animate={{ opacity: 1, transform: "translateY(0px)" }}
                                transition={{ duration: 0.25, delay: 0.25, ease: EASE_OUT }}
                            >
                                <h2 className="mt-6 text-2xl font-bold font-brand text-[#2C2C2C] dark:text-[#F4EFEA]">¡Compra confirmada!</h2>
                                <p className="mt-1.5 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Ya quedó todo registrado en el sistema.</p>
                            </motion.div>

                            <ul className="mt-6 space-y-2 text-left">
                                {[
                                    { Icono: Wallet, titulo: "Caja", texto: `Egreso de ${pesos(confirmada.total)}`, tono: "text-[#97604D] dark:text-[#DBA793] bg-[#C9866F]/12" },
                                    { Icono: Boxes, titulo: "Inventario", texto: `Entraron ${confirmada.productos} ${confirmada.productos === 1 ? "producto" : "productos"} (${confirmada.bultos} ${confirmada.bultos === 1 ? "bulto" : "bultos"})`, tono: "text-[#5A7356] dark:text-[#A3B69B] bg-[#7D9878]/12" },
                                ].map(({ Icono, titulo, texto, tono }, i) => (
                                    <motion.li
                                        key={titulo}
                                        initial={{ opacity: 0, transform: "translateY(6px)" }}
                                        animate={{ opacity: 1, transform: "translateY(0px)" }}
                                        transition={{ duration: 0.25, delay: 0.38 + i * 0.08, ease: EASE_OUT }}
                                        className="flex items-center gap-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] px-3.5 py-3"
                                    >
                                        <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${tono}`}>
                                            <Icono className="w-4 h-4" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{titulo}</span>
                                            <span className="block text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums">{texto}</span>
                                        </span>
                                        <Check className="w-4 h-4 shrink-0 text-[#7D9878]" strokeWidth={2.5} />
                                    </motion.li>
                                ))}
                            </ul>

                            <div className="mt-7 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                                <Link href="/inventario" className={BOTON_SECUNDARIO}>
                                    Ver inventario
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <button type="button" onClick={() => setConfirmada(null)} autoFocus className={BOTON_PRINCIPAL}>
                                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                                    Hacer otro pedido
                                </button>
                            </div>
                        </div>
                    </PanelVentana>
                )}
            </Ventana>

            {/* Elegir esencia para el pedido */}
            <Ventana abierta={isEsenciaModalOpen} onCerrar={() => setIsEsenciaModalOpen(false)} etiqueta="Elegir esencia">
            {isEsenciaModalOpen && (() => {
                    const campoFiltro = CAMPO.replace("h-11", "h-10");
                    const selectFiltro = `${campoFiltro.replace("w-full", "w-auto")} cursor-pointer`;
                    const botonPrecio = "flex flex-col items-end justify-center min-w-[84px] h-12 px-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/60 hover:bg-[#7D9878]/[0.06] active:scale-[0.97] transition-[border-color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50";
                    return (
                    <PanelVentana ancho="lg">
                        <CabeceraVentana
                            etiqueta="Pedido a proveedores"
                            titulo="Elegir esencia"
                            descripcion="Tocá el precio de la presentación que querés pedir."
                            icono={FlaskConical}
                            onCerrar={() => setIsEsenciaModalOpen(false)}
                        >
                            <div role="tablist" className="mt-5 inline-flex p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                                {(["Perfumería", "Limpia Pisos"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        type="button"
                                        role="tab"
                                        aria-selected={esenciaTab === tab}
                                        onClick={() => { setEsenciaTab(tab); setEsenciaGenderFilter("Todos"); setEsenciaProviderFilter("Todos"); setEsenciaCategoryFilter("Todos"); }}
                                        className={`h-9 px-4 rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${esenciaTab === tab
                                            ? "bg-white dark:bg-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm"
                                            : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                    >
                                        {tab === "Perfumería" ? "Perfumería fina" : "Limpia pisos"}
                                    </button>
                                ))}
                            </div>
                        </CabeceraVentana>

                        {/* Buscador y filtros */}
                        <div className="px-7 pt-5 pb-3 flex flex-wrap gap-2 shrink-0">
                            <Buscador
                                valor={esenciaSearch}
                                onCambiar={v => setEsenciaSearch(v)}
                                placeholder="Buscar por nombre…"
                                aria-label="Buscar esencia"
                                autoFocus
                                fondo="crema"
                                className="flex-1 min-w-[200px]"
                            />
                            {esenciaTab === "Perfumería" ? (
                                <>
                                    <Selector aria-label="Género" value={esenciaGenderFilter} onChange={e => setEsenciaGenderFilter(e.target.value)} className={selectFiltro}>
                                        <option value="Todos">Todos los géneros</option>
                                        {generos.filter(g => g.toLowerCase() !== "limpia pisos").map((g, i) => <option key={i} value={g}>{g}</option>)}
                                    </Selector>
                                    <Selector aria-label="Proveedor" value={esenciaProviderFilter} onChange={e => setEsenciaProviderFilter(e.target.value)} className={selectFiltro}>
                                        <option value="Todos">Todos los proveedores</option>
                                        {proveedores.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </Selector>
                                </>
                            ) : (
                                <Selector aria-label="Categoría" value={esenciaCategoryFilter} onChange={e => setEsenciaCategoryFilter(e.target.value)} className={selectFiltro}>
                                    <option value="Todos">Todas las categorías</option>
                                    {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </Selector>
                            )}
                        </div>

                        {/* Lista */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 pb-6">
                            {filteredEsencias.length === 0 ? (
                                <p className="rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-10 text-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                    No se encontraron esencias.
                                </p>
                            ) : (
                                <ul className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 overflow-hidden">
                                    {filteredEsencias.map(e => {
                                        const isLP = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
                                        const gender = e.gender || (e.category?.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
                                        const catLabel = e.category || (isLP ? "Limpia Pisos" : "Perfumería Fina");
                                        const inicial = isLP ? "LP" : gender === "Femenino" ? "F" : "M";
                                        return (
                                            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${!isLP && gender === "Femenino" ? "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]" : "bg-[#7D9878]/12 text-[#5A7356] dark:text-[#A3B69B]"}`}>
                                                    {inicial}
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{e.name}</span>
                                                    <span className="block text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 truncate">
                                                        {catLabel}{e.provider ? ` · ${e.provider}` : ""}
                                                    </span>
                                                </span>
                                                {isLP ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            agregar({
                                                                type: "Esencia",
                                                                item_id: e.id,
                                                                name: e.name,
                                                                category: e.category || "Limpia Pisos",
                                                                bultosToBuy: 1,
                                                                bultoQty: e.qty || 1,
                                                                bultoCost: e.cost || 0,
                                                                unit: "ml"
                                                            });
                                                            setIsEsenciaModalOpen(false);
                                                        }}
                                                        className={botonPrecio}
                                                    >
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">Costo</span>
                                                        <span className="text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(e.cost || 0)}</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2 shrink-0">
                                                        <button type="button" onClick={() => handleSelectEsencia(e, '30g')} className={botonPrecio}>
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">30 g</span>
                                                            <span className="text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                {typeof e.price30g === 'number' ? pesos(e.price30g) : 'Consultar'}
                                                            </span>
                                                        </button>
                                                        <button type="button" onClick={() => handleSelectEsencia(e, '100g')} className={botonPrecio}>
                                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">100 g</span>
                                                            <span className="text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                {typeof e.price100g === 'number' ? pesos(e.price100g) : 'Consultar'}
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </PanelVentana>
                    );
            })()}
            </Ventana>
        </div>
        </MotionConfig>
    );
}
