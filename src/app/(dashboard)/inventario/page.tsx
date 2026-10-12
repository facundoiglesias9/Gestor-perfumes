"use client";

import { Search, Plus, Trash2, FlaskConical, Pencil, Sparkles, Layers, Package, Check, Bell, BellRing, AlertCircle, X, Boxes } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppContext, buscarPerfumeHecho, type InventarioItem } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";
import Desplegable from "@/components/Desplegable";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, ETIQUETA_CAMPO, AYUDA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import IngresarStock from "@/components/IngresarStock";

const TIPOS = [
    { valor: "Todos", titulo: "Todo", Icono: Layers },
    { valor: "Perfume Hecho", titulo: "Perfumes hechos", Icono: Sparkles },
    { valor: "Esencia", titulo: "Esencias", Icono: FlaskConical },
    { valor: "Insumo", titulo: "Insumos", Icono: Package },
] as const;

const NOMBRE_PRESENTACION: Record<string, string> = {
    "Frascos de 50 ML": "50 ml",
    "Frascos de 30 ML": "30 ml",
    "Frascos Difusores": "Difusor",
    "Frascos de Auto": "Auto",
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mismo = (a?: string, b?: string) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
// "212 VIP (CAROLINA HERRERA) 30 ML" → "212 VIP (CAROLINA HERRERA)": el tamaño ya se ve en el cuadrito
const sinPresentacion = (nombre: string) => nombre.replace(/\s+(\d+\s*ML|DIFUSOR|AUTO)\s*$/i, "");

export default function InventarioPage() {
    const { inventario, esencias, insumos, productos, deleteInventarioItem, updateInventarioItem, clearAllInventario } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
    const [editQty, setEditQty] = useState("");

    const [typeFilter, setTypeFilter] = useState("Todos");
    const [presentacion, setPresentacion] = useState("todas");
    const [soloBajos, setSoloBajos] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({});
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [editingAlertItem, setEditingAlertItem] = useState<string | null>(null);
    const [tempThreshold, setTempThreshold] = useState("");

    useEffect(() => {
        try {
            const saved = localStorage.getItem('inventario_alert_thresholds');
            if (saved) {
                setAlertThresholds(JSON.parse(saved));
            }
        } catch { }
    }, []);

    const saveAlertThreshold = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAlertItem) return;

        const num = parseInt(tempThreshold, 10);
        const newThresholds = { ...alertThresholds };

        if (!isNaN(num) && num > 0) {
            newThresholds[editingAlertItem] = num;
        } else {
            delete newThresholds[editingAlertItem]; // Remove if set to 0 or invalid
        }

        setAlertThresholds(newThresholds);
        localStorage.setItem('inventario_alert_thresholds', JSON.stringify(newThresholds));
        setIsAlertModalOpen(false);
        setEditingAlertItem(null);
    };

    const estaBajo = (item: InventarioItem) => {
        const limite = alertThresholds[item.name];
        return limite !== undefined && item.qty <= limite;
    };

    // Lo que coincide con la búsqueda (sin importar tildes ni mayúsculas, cada palabra por separado)
    const coincidenBusqueda = useMemo(() => {
        const palabras = normalizar(searchTerm).split(/\s+/).filter(Boolean);
        return inventario.filter(item => {
            const texto = normalizar(`${item.name} ${item.category} ${item.type} ${item.gender ?? ""} ${NOMBRE_PRESENTACION[item.category] ?? ""}`);
            return palabras.every(p => texto.includes(p));
        });
    }, [inventario, searchTerm]);

    const cuentaTipo = (valor: string) => valor === "Todos" ? coincidenBusqueda.length : coincidenBusqueda.filter(i => i.type === valor).length;

    // Presentaciones (50 ml, 30 ml…) de lo que se está viendo; el filtro aparece si hay más de una
    const delTipo = coincidenBusqueda.filter(i => typeFilter === "Todos" || i.type === typeFilter);
    const presentaciones = useMemo(() => {
        const orden = Object.keys(NOMBRE_PRESENTACION);
        const lugar = (c: string) => orden.includes(c) ? orden.indexOf(c) : orden.length;
        return [...new Set(delTipo.filter(i => i.type === "Perfume Hecho").map(i => i.category))]
            .sort((a, b) => lugar(a) - lugar(b) || a.localeCompare(b, "es"));
    }, [delTipo]);
    const presentacionActiva = presentaciones.includes(presentacion) ? presentacion : "todas";

    const filteredInventario = useMemo(() => {
        const ordenTipo = (t: string) => ["Perfume Hecho", "Esencia", "Insumo"].indexOf(t);
        return delTipo
            .filter(i => presentacionActiva === "todas" || i.category === presentacionActiva)
            .filter(i => !soloBajos || estaBajo(i))
            .sort((a, b) => ordenTipo(a.type) - ordenTipo(b.type) || a.name.localeCompare(b.name, "es"));
    }, [delTipo, presentacionActiva, soloBajos, alertThresholds]);

    // La columna "Tipo" solo aparece si en la lista hay más de un tipo (si todo son perfumes hechos, sobra)
    const mostrarTipo = new Set(filteredInventario.map(i => i.type)).size > 1;

    const hayFiltros = searchTerm.trim() !== "" || typeFilter !== "Todos" || presentacionActiva !== "todas" || soloBajos;
    const limpiarFiltros = () => {
        setSearchTerm("");
        setTypeFilter("Todos");
        setPresentacion("todas");
        setSoloBajos(false);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            deleteInventarioItem(itemToDelete);
            setItemToDelete(null);
        }
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem && editQty) {
            updateInventarioItem(editingItem.id, parseFloat(editQty));
            setIsEditModalOpen(false);
            setEditingItem(null);
            setEditQty("");
        }
    };

    const alertCount = inventario.filter(estaBajo).length;
    const unidadesHechas = inventario.filter(i => i.type === "Perfume Hecho").reduce((acc, i) => acc + Number(i.qty || 0), 0);
    const cuantosDe = (tipo: string) => inventario.filter(i => i.type === tipo).length;

    // Valor del stock al costo: perfumes hechos al costo del producto; esencias por gramo y insumos por unidad
    // (igual que el costo de las recetas: el precio del paquete dividido lo que trae)
    const valorizadoTotal = useMemo(() => {
        return inventario.reduce((acc, item) => {
            let costoUnidad = 0;
            if (item.type === "Perfume Hecho") {
                costoUnidad = productos.find(p => buscarPerfumeHecho([item], p))?.cost || 0;
            } else if (item.type === "Esencia") {
                const e = esencias.find(x => mismo(x.name, item.name));
                if (e) {
                    const p100 = Number(e.price100g), p30 = Number(e.price30g);
                    costoUnidad = p100 > 0 ? p100 / 100 : p30 > 0 ? p30 / 30 : (e.cost || 0) / (e.qty || 1);
                }
            } else {
                const ins = insumos.find(x => mismo(x.name, item.name));
                if (ins) costoUnidad = (ins.cost || 0) / (ins.qty || 1);
            }
            return acc + costoUnidad * Number(item.qty || 0);
        }, 0);
    }, [inventario, esencias, insumos, productos]);

    const hoy = new Date().toLocaleDateString("es-AR");

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
            <header className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-[2rem] px-6 py-9 md:px-10 md:py-11 border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-36 w-[760px] max-w-full h-72 rounded-full bg-[#7D9878]/[0.14] dark:bg-[#A3B69B]/[0.07] blur-3xl" />
                <div className="relative flex flex-col items-center text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                        <Boxes className="w-3.5 h-3.5" />
                        Stock
                    </span>
                    <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Inventario</h1>
                    <p className="mt-3 max-w-xl text-base md:text-lg text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 leading-relaxed text-balance">
                        Lo que tenés hoy: perfumes ya hechos, esencias e insumos.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            Ingresar stock
                        </button>
                        {inventario.length > 0 && (
                            <button
                                onClick={clearAllInventario}
                                className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#B5654A] dark:hover:text-[#DBA793] hover:bg-[#C9866F]/10 active:scale-[0.97] transition-[background-color,color,transform] duration-150"
                            >
                                <Trash2 className="w-4 h-4" />
                                Vaciar inventario
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Resumen: tres datos en una franja, sin números gigantes */}
            <section aria-label="Resumen del stock" className="anim-entrada [animation-delay:60ms] grid grid-cols-1 sm:grid-cols-3 rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-[#E6DFD5] dark:divide-[#353B33]">
                <div className="px-6 py-5 text-center">
                    <p className="text-xs font-medium text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">En stock</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                        {inventario.length} <span className="text-sm font-medium text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{inventario.length === 1 ? "ítem" : "ítems"}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                        {[
                            cuantosDe("Perfume Hecho") > 0 && `${numero(unidadesHechas)} perfumes hechos`,
                            cuantosDe("Esencia") > 0 && `${cuantosDe("Esencia")} esencias`,
                            cuantosDe("Insumo") > 0 && `${cuantosDe("Insumo")} insumos`,
                        ].filter(Boolean).join(" · ") || "Todavía no cargaste nada"}
                    </p>
                </div>
                <div className="px-6 py-5 text-center">
                    <p className="text-xs font-medium text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Valor al costo</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">${Math.round(valorizadoTotal).toLocaleString("es-AR")}</p>
                    <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Lo que te costó todo lo que hay</p>
                </div>
                <div className="px-6 py-5 text-center">
                    <p className="text-xs font-medium text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Stock bajo</p>
                    {alertCount > 0 ? (
                        <>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#B5654A] dark:text-[#DBA793]">
                                {alertCount} <span className="text-sm font-medium">{alertCount === 1 ? "ítem" : "ítems"}</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => { setSoloBajos(true); setTypeFilter("Todos"); }}
                                className="mt-1 text-xs font-semibold text-[#B5654A] dark:text-[#DBA793] hover:underline underline-offset-2"
                            >
                                Ver cuáles
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">0</p>
                            <p className="mt-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Todo en orden</p>
                        </>
                    )}
                </div>
            </section>

            {/* Tabla */}
            <section aria-label="Stock" className="anim-entrada [animation-delay:120ms] rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <div role="tablist" aria-label="Tipo" className="flex gap-1 p-1 rounded-xl bg-[#F4EFE7] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
                        {TIPOS.map(({ valor, titulo, Icono }) => {
                            const activo = typeFilter === valor;
                            return (
                                <button
                                    key={valor}
                                    type="button"
                                    role="tab"
                                    aria-selected={activo}
                                    onClick={() => setTypeFilter(valor)}
                                    className={`relative h-9 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                >
                                    {activo && (
                                        <motion.span
                                            layoutId="inventario-tipo"
                                            className="absolute inset-0 rounded-lg bg-white dark:bg-[#30352F] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                            transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                                        />
                                    )}
                                    <span className="relative flex items-center gap-1.5">
                                        <Icono className="w-3.5 h-3.5" aria-hidden />
                                        {titulo}
                                        <span className="text-xs font-medium tabular-nums opacity-55">{cuentaTipo(valor)}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 pointer-events-none" aria-hidden />
                            <input
                                type="search"
                                aria-label="Buscar en el stock"
                                placeholder="Buscar por nombre, marca o tamaño"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`${CAMPO} pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden`}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    aria-label="Borrar búsqueda"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/[0.08] transition-colors duration-150"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {presentaciones.length > 1 && (
                            <Desplegable
                                valor={presentacionActiva}
                                opciones={[{ valor: "todas", titulo: "Todos los tamaños" }, ...presentaciones.map(p => ({ valor: p, titulo: NOMBRE_PRESENTACION[p] ?? p }))]}
                                onCambiar={setPresentacion}
                                etiqueta="Tamaño"
                                alto="lg"
                                resaltado={presentacionActiva !== "todas"}
                                className="sm:w-48 shrink-0"
                            />
                        )}
                    </div>
                </div>

                {(soloBajos || hayFiltros) && (
                    <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-b border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0]/70 dark:bg-[#1B1D1A]/50 text-[13px]">
                        <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                            {soloBajos ? "Mostrando solo lo que tiene stock bajo · " : ""}
                            {filteredInventario.length} {filteredInventario.length === 1 ? "resultado" : "resultados"}
                        </span>
                        <button type="button" onClick={limpiarFiltros} className="font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline underline-offset-2">
                            Ver todo
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-xs font-medium text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th scope="col" className="py-3 pl-5 pr-3 text-left font-medium">Producto</th>
                                {mostrarTipo && <th scope="col" className="py-3 px-3 w-40 text-center font-medium">Tipo</th>}
                                <th scope="col" className="py-3 px-3 w-36 text-center font-medium">Cantidad</th>
                                <th scope="col" className="py-3 px-3 w-32 text-center font-medium">Actualizado</th>
                                <th scope="col" className="py-3 pl-3 pr-5 w-36 text-right font-medium"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                            {filteredInventario.map((item) => {
                                const threshold = alertThresholds[item.name];
                                const isAlert = estaBajo(item);
                                return (
                                    <tr key={item.id} className={`group transition-colors duration-150 ${isAlert ? "bg-[#C9866F]/[0.06]" : "hover:bg-[#F9F6F0] dark:hover:bg-[#2A2E29]"}`}>
                                        <td className="py-3 pl-5 pr-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Distintivo item={item} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] truncate max-w-[22rem]" title={item.name}>
                                                        {item.type === "Perfume Hecho" ? sinPresentacion(item.name) : item.name}
                                                    </p>
                                                    <p className="mt-0.5 flex items-center gap-2 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                                        {item.gender && <Genero genero={item.gender} />}
                                                        {item.type !== "Perfume Hecho" && item.category && <span className="truncate">{NOMBRE_PRESENTACION[item.category] ?? item.category}</span>}
                                                        {threshold !== undefined && (
                                                            <span className={isAlert ? "font-semibold text-[#B5654A] dark:text-[#DBA793]" : ""}>
                                                                {isAlert ? `Stock bajo (aviso en ${threshold})` : `Aviso en ${threshold}`}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {mostrarTipo && (
                                            <td className="py-3 px-3 text-center">
                                                <Tipo tipo={item.type} />
                                            </td>
                                        )}
                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                            <span className={`text-base font-semibold tabular-nums ${isAlert ? "text-[#B5654A] dark:text-[#DBA793]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                                {numero(item.qty)}
                                            </span>
                                            <span className="ml-1 text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{item.unit === "u." ? (item.qty === 1 ? "unidad" : "unidades") : item.unit}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center text-[13px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 whitespace-nowrap">
                                            {item.lastUpdate === hoy ? "Hoy" : item.lastUpdate}
                                        </td>
                                        <td className="py-3 pl-3 pr-5">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <BotonAccion
                                                    titulo={threshold !== undefined ? `Aviso de stock bajo: ${threshold}` : "Avisarme cuando quede poco"}
                                                    activo={threshold !== undefined}
                                                    onClick={() => {
                                                        setEditingAlertItem(item.name);
                                                        setTempThreshold(alertThresholds[item.name]?.toString() || "");
                                                        setIsAlertModalOpen(true);
                                                    }}
                                                >
                                                    {threshold !== undefined ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                </BotonAccion>
                                                <BotonAccion
                                                    titulo="Corregir cantidad"
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setEditQty(item.qty.toString());
                                                        setIsEditModalOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </BotonAccion>
                                                <BotonAccion titulo="Quitar del stock" peligro onClick={() => setItemToDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </BotonAccion>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredInventario.length === 0 && (
                        <div className="px-6 py-16 flex flex-col items-center text-center">
                            <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]">
                                {inventario.length === 0 ? <Boxes className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </span>
                            <p className="mt-3 text-sm font-medium text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                                {inventario.length === 0 ? "Todavía no cargaste stock." : "No hay nada que coincida con la búsqueda."}
                            </p>
                            {inventario.length === 0 ? (
                                <button onClick={() => setIsAddModalOpen(true)} className="mt-3 text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline underline-offset-2">
                                    Ingresar stock
                                </button>
                            ) : (
                                <button onClick={limpiarFiltros} className="mt-3 text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline underline-offset-2">
                                    Ver todo
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Quitar del stock"
                message="Se borra este ítem de la lista de inventario. Si lo volvés a tener, lo cargás de nuevo con Ingresar stock."
                confirmText="Quitar"
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Aviso de stock bajo */}
            <Ventana abierta={isAlertModalOpen} onCerrar={() => setIsAlertModalOpen(false)} etiqueta="Aviso de stock bajo">
            {isAlertModalOpen && (
                    <PanelVentana ancho="sm">
                        <CabeceraVentana
                            etiqueta="Aviso de stock bajo"
                            titulo={editingAlertItem}
                            icono={AlertCircle}
                            tono="terracota"
                            onCerrar={() => setIsAlertModalOpen(false)}
                        />
                        <form onSubmit={saveAlertThreshold} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana>
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Avisarme cuando queden</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(e.target.value)}
                                        className={`${CAMPO.replace("h-11", "h-14").replace("text-sm", "text-2xl")} font-semibold tabular-nums`}
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <span className={`block ${AYUDA_CAMPO}`}>Avisa cuando el stock baja a esta cantidad o menos. Dejalo en 0 para no recibir avisos.</span>
                                </label>
                            </CuerpoVentana>
                            <PieVentana>
                                <button type="button" onClick={() => setIsAlertModalOpen(false)} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    Guardar aviso
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
            )}
            </Ventana>

            <IngresarStock abierta={isAddModalOpen} onCerrar={() => setIsAddModalOpen(false)} />

            {/* Ajustar stock (lápiz) */}
            <Ventana abierta={isEditModalOpen} onCerrar={() => setIsEditModalOpen(false)} cerrarAlTocarFondo={false} etiqueta="Ajustar stock">
            {isEditModalOpen && (
                    <PanelVentana ancho="sm">
                        <CabeceraVentana
                            etiqueta="Corregir cantidad"
                            titulo={editingItem?.name}
                            icono={Pencil}
                            onCerrar={() => setIsEditModalOpen(false)}
                        />
                        <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana>
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Cantidad que hay ahora</span>
                                    <span className="relative block">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editQty}
                                            onChange={(e) => setEditQty(e.target.value)}
                                            className={`${CAMPO.replace("h-11", "h-14").replace("text-sm", "text-2xl")} pr-14 font-semibold tabular-nums`}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">
                                            {editingItem?.unit}
                                        </span>
                                    </span>
                                    <span className={`block ${AYUDA_CAMPO}`}>Reemplaza la cantidad anterior por esta.</span>
                                </label>
                            </CuerpoVentana>
                            <PieVentana>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    Guardar
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
            )}
            </Ventana>
        </div>
    );
}

// ── Piezas de la tabla ───────────────────────────────────────────

/** Cuadrito de la izquierda: el tamaño bien marcado (50 ml / 30 ml) o el ícono de esencia / insumo */
function Distintivo({ item }: { item: InventarioItem }) {
    if (item.type === "Perfume Hecho") {
        const ml = item.category?.match(/(\d+)\s*ML/i)?.[1];
        if (ml) {
            return (
                <span className="w-10 h-10 shrink-0 rounded-xl flex flex-col items-center justify-center bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A]" aria-label={`${ml} ml`}>
                    <span className="text-sm font-black leading-none tabular-nums">{ml}</span>
                    <span className="text-[9px] font-bold leading-none mt-0.5">ml</span>
                </span>
            );
        }
        return (
            <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-[#2C2C2C]/[0.07] dark:bg-white/[0.08] text-[9px] font-bold uppercase tracking-wide text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75">
                {NOMBRE_PRESENTACION[item.category] ?? "—"}
            </span>
        );
    }
    const Icono = item.type === "Esencia" ? FlaskConical : Package;
    return (
        <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]">
            <Icono className="w-[18px] h-[18px]" aria-hidden />
        </span>
    );
}

const COLOR_GENERO: Record<string, string> = {
    Femenino: "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]",
    Masculino: "bg-[#7D9878]/12 text-[#4F684B] dark:text-[#A3B69B]",
};

function Genero({ genero }: { genero: string }) {
    return (
        <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-semibold leading-none ${COLOR_GENERO[genero] ?? "bg-[#2C2C2C]/[0.06] dark:bg-white/[0.08] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}>
            {genero}
        </span>
    );
}

const TIPO_VISUAL: Record<string, { texto: string; punto: string }> = {
    "Perfume Hecho": { texto: "Perfume hecho", punto: "bg-[#7D9878]" },
    Esencia: { texto: "Esencia", punto: "bg-[#C9866F]" },
    Insumo: { texto: "Insumo", punto: "bg-[#8C8579]" },
};

function Tipo({ tipo }: { tipo: string }) {
    const v = TIPO_VISUAL[tipo] ?? { texto: tipo, punto: "bg-[#8C8579]" };
    return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 whitespace-nowrap">
            <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${v.punto}`} />
            {v.texto}
        </span>
    );
}

function BotonAccion({ titulo, onClick, activo, peligro, children }: {
    titulo: string;
    onClick: () => void;
    activo?: boolean;
    peligro?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={titulo}
            aria-label={titulo}
            className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo
                ? "text-[#5A7356] dark:text-[#A3B69B] bg-[#7D9878]/10"
                : peligro
                    ? "text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 hover:text-[#B5654A] dark:hover:text-[#DBA793] hover:bg-[#C9866F]/10"
                    : "text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/[0.08]"}`}
        >
            {children}
        </button>
    );
}
