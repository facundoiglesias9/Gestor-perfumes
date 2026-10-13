"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Percent, RotateCcw, RefreshCw, Check, Loader2, TriangleAlert } from "lucide-react";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import { useAppContext, Producto } from "@/context/AppContext";
import { upsertRecords } from "@/lib/db-actions";
import ConfirmModal from "@/components/ConfirmModal";

// % de ganancia por categoría: cuánto se le suma al costo para armar el precio mayorista
// y el minorista. Al aplicar, se recalculan los precios de todos los productos de la
// categoría con su costo actual (redondeado hacia arriba a $100).

type Margen = { may: number; min: number };

const PREDETERMINADO = { mayorista: 1.5, minorista: 2.0 };
const normalizar = (s?: string) => (s || "").trim().toLowerCase();
const redondearA100 = (n: number) => Math.ceil(n / 100) * 100;
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

// Porcentaje con botones de menos y más (de a 5)
function CampoPorcentaje({ valor, etiqueta, cambiado, onCambiar }: {
    valor: number; etiqueta: string; cambiado: boolean; onCambiar: (n: number) => void;
}) {
    const boton = "w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/55 dark:text-[#F4EFEA]/55 hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/10 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] active:scale-[0.92] transition-[background-color,color,transform] duration-150 disabled:opacity-30 disabled:pointer-events-none";
    const limitar = (n: number) => Math.max(0, Math.min(1000, Math.round(n)));
    return (
        <div className={`inline-flex items-center gap-0.5 h-10 px-1 rounded-xl border bg-[#F9F6F0] dark:bg-[#1B1D1A] transition-[border-color,box-shadow] duration-150 focus-within:ring-2 focus-within:ring-[#7D9878]/20 ${cambiado ? "border-[#7D9878]/70" : "border-[#E6DFD5] dark:border-[#353B33] focus-within:border-[#7D9878]/70"}`}>
            <button type="button" aria-label={`Restar 5 al ${etiqueta}`} className={boton} disabled={valor <= 0} onClick={() => onCambiar(limitar(valor - 5))}>
                <Minus className="w-3.5 h-3.5" />
            </button>
            <input
                type="number"
                inputMode="numeric"
                aria-label={etiqueta}
                value={valor}
                onFocus={e => e.target.select()}
                onChange={e => onCambiar(limitar(parseFloat(e.target.value) || 0))}
                className="w-10 bg-transparent text-right text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] outline-none"
            />
            <span className="w-4 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">%</span>
            <button type="button" aria-label={`Sumar 5 al ${etiqueta}`} className={boton} onClick={() => onCambiar(limitar(valor + 5))}>
                <Plus className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default function PorcentajeGananciaPage() {
    const { categorias, categoryMargins, setCategoryMargins, productos, setProductos, esencias, insumos } = useAppContext();
    // Solo se guardan acá las categorías que se están editando; el resto muestra lo guardado
    const [borradores, setBorradores] = useState<Record<string, Margen>>({});
    const [procesando, setProcesando] = useState<string | null>(null);
    // Categoría a confirmar: se guarda aparte de "abierta" para que el texto no desaparezca mientras la ventana se cierra
    const [confirmar, setConfirmar] = useState<string | null>(null);
    const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
    const pedirConfirmacion = (cat: string) => {
        setConfirmar(cat);
        setConfirmacionAbierta(true);
    };

    const guardado = (cat: string): Margen => {
        const m = categoryMargins[cat] || PREDETERMINADO;
        return { may: Math.round((m.mayorista - 1) * 100), min: Math.round((m.minorista - 1) * 100) };
    };
    const actual = (cat: string): Margen => borradores[cat] ?? guardado(cat);
    const estaCambiado = (cat: string) => {
        const b = borradores[cat];
        if (!b) return false;
        const g = guardado(cat);
        return b.may !== g.may || b.min !== g.min;
    };

    const cambiar = (cat: string, campo: keyof Margen, valor: number) =>
        setBorradores(prev => ({ ...prev, [cat]: { ...actual(cat), [campo]: valor } }));

    const deshacer = (cat: string) =>
        setBorradores(prev => {
            const resto = { ...prev };
            delete resto[cat];
            return resto;
        });

    // Productos de cada categoría y un costo típico (la mediana) para mostrar un ejemplo real
    const porCategoria = useMemo(() => {
        const mapa: Record<string, { productos: Producto[]; costoEjemplo: number }> = {};
        for (const cat of categorias) {
            const lista = productos.filter(p => normalizar(p.category) === normalizar(cat.name));
            const costos = lista.map(p => Number(p.cost) || 0).filter(c => c > 0).sort((a, b) => a - b);
            mapa[cat.name] = {
                productos: lista,
                costoEjemplo: costos.length ? costos[Math.floor(costos.length / 2)] : 10000,
            };
        }
        return mapa;
    }, [categorias, productos]);

    const calcularCosto = (p: Producto) => {
        return p.components.reduce((acc, comp) => {
            const origen = comp.type === "Esencia"
                ? esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase())
                : insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase());
            if (!origen) return acc;
            let costoUnidad = 0;
            if (comp.type === "Esencia") {
                const esc = origen as any;
                const p250 = parseFloat(esc.price250g);
                const p100 = parseFloat(esc.price100g);
                const p30 = parseFloat(esc.price30g);
                if (!isNaN(p250) && p250 > 0) costoUnidad = p250 / 250;
                else if (!isNaN(p100) && p100 > 0) costoUnidad = p100 / 100;
                else if (!isNaN(p30) && p30 > 0) costoUnidad = p30 / 30;
                else costoUnidad = origen.cost / (origen.qty || 1);
            } else {
                costoUnidad = origen.cost / (origen.qty || 1);
            }
            return acc + costoUnidad * comp.qty;
        }, 0);
    };

    // Guarda el % y recalcula los precios de todos los productos de la categoría
    const aplicar = async (cat: string) => {
        setConfirmacionAbierta(false);
        setProcesando(cat);
        const { may, min } = actual(cat);
        const multMay = 1 + may / 100;
        const multMin = 1 + min / 100;

        setCategoryMargins(prev => ({ ...prev, [cat]: { mayorista: multMay, minorista: multMin } }));
        deshacer(cat);

        const objetivo = porCategoria[cat]?.productos ?? [];
        if (objetivo.length === 0) {
            toast("Porcentaje guardado", { description: `${cat} todavía no tiene productos para actualizar.` });
            setProcesando(null);
            return;
        }

        const actualizados: Producto[] = objetivo.map(p => {
            const costo = calcularCosto(p);
            return { ...p, cost: costo, price: redondearA100(costo * multMay), priceMinorista: redondearA100(costo * multMin) };
        });

        setProductos(prev => prev.map(p => actualizados.find(a => a.id === p.id) ?? p));

        const { error } = await upsertRecords("productos", actualizados.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category,
            base_id: a.baseId,
            components: a.components,
            cost: a.cost,
            price: a.price,
            price_minorista: a.priceMinorista,
            stock: a.stock,
            description: a.description,
            gender: a.gender,
            last_update: a.lastUpdate,
        })));

        if (error) {
            toast.error("No se pudieron guardar los precios", { description: "Revisá la conexión y probá de nuevo." });
        } else {
            toast.success("Precios actualizados", { description: `${actualizados.length} productos de ${cat}.` });
        }
        setProcesando(null);
    };

    const totalProductos = categorias.reduce((acc, c) => acc + (porCategoria[c.name]?.productos.length ?? 0), 0);
    const aConfirmar = confirmar ? { ...actual(confirmar), cantidad: porCategoria[confirmar]?.productos.length ?? 0 } : null;

    return (
        <div className="space-y-6 pb-16 max-w-[1200px] mx-auto">
            {/* Encabezado centrado, igual que el resto de las páginas */}
            <EncabezadoPagina
                icono={Percent}
                titulo="% de ganancia"
                descripcion="Lo que se le suma al costo de cada producto para armar su precio (redondeado hacia arriba a $100)."
            >
                <span className="px-3.5 py-2 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-sm text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 whitespace-nowrap">
                    <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{categorias.length}</strong> {categorias.length === 1 ? "categoría" : "categorías"} · <strong className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{totalProductos}</strong> productos
                </span>
            </EncabezadoPagina>

            {categorias.length === 0 ? (
                <div className="anim-entrada flex flex-col items-center text-center py-16 px-6 rounded-[2rem] border border-dashed border-[#E6DFD5] dark:border-[#353B33]">
                    <TriangleAlert className="w-7 h-7 text-[#C9866F] mb-3" />
                    <h3 className="text-lg font-bold font-brand text-[#2C2C2C] dark:text-[#F4EFEA]">Todavía no hay categorías</h3>
                    <p className="mt-1 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 max-w-sm">Creálas en Parámetros y Clasificación para poder ponerles un % de ganancia.</p>
                </div>
            ) : (
                <section className="anim-entrada [animation-delay:60ms] bg-white dark:bg-[#242723] rounded-[1.75rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm overflow-hidden">
                    {/* Títulos de columna (en pantallas anchas) */}
                    <div className="hidden lg:grid grid-cols-[minmax(0,1.2fr)_auto_auto_minmax(0,1.1fr)_9.5rem] items-center gap-6 px-6 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                        <span>Categoría</span>
                        <span className="w-[8.75rem]">Mayorista</span>
                        <span className="w-[8.75rem]">Minorista</span>
                        <span>Ejemplo de precio</span>
                        <span />
                    </div>

                    <ul className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                        {categorias.map(cat => {
                            const valores = actual(cat.name);
                            const g = guardado(cat.name);
                            const cambiado = estaCambiado(cat.name);
                            const datos = porCategoria[cat.name];
                            const cantidad = datos?.productos.length ?? 0;
                            const costo = datos?.costoEjemplo ?? 10000;
                            const ocupada = procesando === cat.name;
                            return (
                                <li
                                    key={cat.id}
                                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_auto_auto_minmax(0,1.1fr)_9.5rem] items-center gap-x-6 gap-y-3 px-6 py-5 transition-colors duration-200 ${cambiado ? "bg-[#7D9878]/[0.05] dark:bg-[#7D9878]/[0.08]" : ""}`}
                                >
                                    <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                                        <p className="text-base font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{cat.name}</p>
                                        <p className="mt-0.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 tabular-nums">
                                            {cantidad} {cantidad === 1 ? "producto" : "productos"}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="lg:hidden block mb-1.5 text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Mayorista</span>
                                        <CampoPorcentaje
                                            valor={valores.may}
                                            etiqueta={`porcentaje mayorista de ${cat.name}`}
                                            cambiado={valores.may !== g.may}
                                            onCambiar={n => cambiar(cat.name, "may", n)}
                                        />
                                    </div>
                                    <div>
                                        <span className="lg:hidden block mb-1.5 text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Minorista</span>
                                        <CampoPorcentaje
                                            valor={valores.min}
                                            etiqueta={`porcentaje minorista de ${cat.name}`}
                                            cambiado={valores.min !== g.min}
                                            onCambiar={n => cambiar(cat.name, "min", n)}
                                        />
                                    </div>

                                    {/* Cómo queda el precio de un producto de costo típico */}
                                    <div className="text-sm sm:col-span-2 lg:col-span-1">
                                        <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                            Si un producto cuesta <span className="tabular-nums">{pesos(costo)}</span>, se vende a:
                                        </p>
                                        <p className="mt-0.5 flex flex-wrap gap-x-4 tabular-nums">
                                            <span className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                                                <span className="font-semibold text-[#3F5A3C] dark:text-[#A3B69B]">{pesos(redondearA100(costo * (1 + valores.may / 100)))}</span> mayorista
                                            </span>
                                            <span className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                                                <span className="font-semibold text-[#97604D] dark:text-[#DBA793]">{pesos(redondearA100(costo * (1 + valores.min / 100)))}</span> minorista
                                            </span>
                                        </p>
                                    </div>

                                    {/* Acción: aplicar lo cambiado o recalcular con los costos de hoy */}
                                    <div className="flex items-center gap-1 sm:col-span-2 lg:col-span-1 lg:justify-end">
                                        {cambiado && !ocupada && (
                                            <button
                                                type="button"
                                                onClick={() => deshacer(cat.name)}
                                                title="Volver al porcentaje guardado"
                                                aria-label={`Deshacer cambios de ${cat.name}`}
                                                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/10 active:scale-[0.94] transition-[background-color,color,transform] duration-150"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!!procesando}
                                            onClick={() => pedirConfirmacion(cat.name)}
                                            title={cambiado ? "Guardar el porcentaje y actualizar los precios" : "Volver a calcular los precios con los costos de hoy"}
                                            className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none transition-[background-color,border-color,color,transform,opacity] duration-150 ${cambiado
                                                ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566]"
                                                : "border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#7D9878]/50"}`}
                                        >
                                            {ocupada ? <Loader2 className="w-4 h-4 animate-spin" /> : cambiado ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            {ocupada ? "Actualizando…" : cambiado ? "Aplicar" : "Recalcular"}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <p className="text-center text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                «Recalcular» sirve cuando cambian los costos de esencias o insumos: actualiza los precios sin tocar el porcentaje.
            </p>

            <ConfirmModal
                isOpen={confirmacionAbierta}
                title={confirmar ? `Actualizar precios de ${confirmar}` : ""}
                message={aConfirmar
                    ? `Se van a recalcular ${aConfirmar.cantidad} productos con su costo actual: mayorista +${aConfirmar.may} % y minorista +${aConfirmar.min} %, redondeado a $100. Los precios anteriores se reemplazan.`
                    : ""}
                confirmText="Actualizar precios"
                peligro={false}
                onConfirm={() => confirmar && aplicar(confirmar)}
                onCancel={() => setConfirmacionAbierta(false)}
            />
        </div>
    );
}
