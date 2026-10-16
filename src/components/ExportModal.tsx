"use client";

import { Check, FileSpreadsheet, FileText, LoaderCircle, Layers, PackageCheck, Clock } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Producto, useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TodoNada, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (filteredData: Producto[], format: "excel" | "pdf") => void | Promise<void>;
    productos: Producto[];
    categorias: { id: string; name: string }[];
    generos: string[];
    initialFilters: {
        category?: string;
        gender?: string;
        showOutOfStock?: boolean;
        showConsult?: boolean;
    };
    type: "excel" | "pdf";
    /** Nombre de la lista que se exporta (Minorista o Mayorista) */
    lista?: string;
}

type Stock = "todo" | "con-stock" | "sin-stock";

const OPCIONES_STOCK: { key: Stock; titulo: string; detalle: string; Icono: typeof Layers }[] = [
    { key: "todo", titulo: "Todo", detalle: "La lista completa", Icono: Layers },
    { key: "con-stock", titulo: "Con stock", detalle: "Perfumes hechos, entrega ya", Icono: PackageCheck },
    { key: "sin-stock", titulo: "Sin stock", detalle: "Hay que prepararlos", Icono: Clock },
];

// Chip chico para elegir categorías y géneros
const chip = (elegido: boolean) =>
    `inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[13px] font-medium active:scale-[0.97] transition-[border-color,background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${elegido
        ? "border-[#7D9878] bg-[#7D9878]/[0.1] dark:bg-[#7D9878]/[0.16] text-[#3F5A3C] dark:text-[#C5D6BF]"
        : "border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:border-[#7D9878]/50"}`;

// Casilla de una opción de sí/no, en una línea
function Casilla({ activo, onCambiar, titulo, detalle }: { activo: boolean; onCambiar: (v: boolean) => void; titulo: string; detalle: string }) {
    return (
        <label className="flex items-start gap-3 py-2 cursor-pointer select-none">
            <input type="checkbox" checked={activo} onChange={e => onCambiar(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#7D9878] cursor-pointer" />
            <span className="text-sm">
                <span className="font-medium text-[#2C2C2C] dark:text-[#F4EFEA]">{titulo}</span>
                <span className="block text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{detalle}</span>
            </span>
        </label>
    );
}

const esAmbiente = (cat: string) => /DIFUSOR|AUTO|LIMPIA|AMBIENTE/.test(cat);

export default function ExportModal({
    isOpen,
    onClose,
    onExport,
    productos,
    categorias,
    generos,
    initialFilters,
    type,
    lista
}: ExportModalProps) {
    const { disponibilidadDe: auto } = useAppContext();
    const [generando, setGenerando] = useState(false);
    const [stock, setStock] = useState<Stock>("todo");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
    const [incluirSinPrecio, setIncluirSinPrecio] = useState(false);
    // Los "sin stock" de verdad (esencia a consultar): solo si la página los estaba mostrando
    const [incluirSinStock, setIncluirSinStock] = useState(false);
    const [mostrarDisponibilidad, setMostrarDisponibilidad] = useState(true);


    const availableCategories = useMemo(() => {
        const catMap = new Map<string, string>();
        const addCat = (c: string) => {
            const trimmed = c.trim();
            if (!trimmed) return;
            const lower = trimmed.toLowerCase();
            // Conservar la versión que tenga mayúsculas si ya existe una todo en minúsculas
            if (!catMap.has(lower) || (trimmed !== lower && catMap.get(lower) === lower)) catMap.set(lower, trimmed);
        };
        productos.forEach(p => { if (p.category) addCat(p.category); });
        categorias.forEach(c => addCat(c.name));
        return Array.from(catMap.values()).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    }, [productos, categorias]);

    const availableGenders = useMemo(() => generos.filter(g => {
        if (["Femenino", "Masculino", "Unisex", "Ambiente"].includes(g)) return true;
        // Fuera los que repiten una categoría (ej: "Auto")
        const gLower = g.toLowerCase();
        return !availableCategories.some(c => c.toLowerCase().includes(gLower) || gLower.includes(c.toLowerCase()));
    }), [generos, availableCategories]);

    // Al abrir (y solo al abrir), arranca con los filtros que tiene la página; si después se
    // actualizan los datos de fondo, lo que eligió el usuario no se pierde.
    const { category: catInicial, gender: generoInicial, showConsult: sinPrecioInicial, showOutOfStock: sinStockInicial } = initialFilters;
    const iniciales = useRef({ catInicial, generoInicial, sinPrecioInicial, sinStockInicial, availableCategories, availableGenders });
    iniciales.current = { catInicial, generoInicial, sinPrecioInicial, sinStockInicial, availableCategories, availableGenders };
    useEffect(() => {
        if (!isOpen) return;
        const i = iniciales.current;
        setSelectedCategories(i.catInicial && i.catInicial !== "Todas" ? [i.catInicial] : i.availableCategories);
        setSelectedGenders(i.generoInicial && i.generoInicial !== "Todos" ? [i.generoInicial] : i.availableGenders);
        setIncluirSinPrecio(i.sinPrecioInicial || false);
        setIncluirSinStock(i.sinStockInicial || false);
        setStock("todo");
    }, [isOpen]);

    // Filtros por separado, así cada grupo cuenta cuántos quedarían
    const conPrecio = (p: Producto) => {
        const precio = Number(lista === "Mayorista" ? p.price : p.priceMinorista);
        return incluirSinPrecio || (Number.isFinite(precio) && precio > 0);
    };
    const pasaStock = (p: Producto, s: Stock = stock) => {
        const estado = auto(p).estado;
        if (estado === "sin-stock" && !incluirSinStock) return false;
        return s === "todo" || (s === "con-stock" ? estado === "disponible" : estado !== "disponible");
    };
    const pasaCategoria = (p: Producto) =>
        selectedCategories.some(c => c.trim().toUpperCase() === (p.category || "").trim().toUpperCase());
    const pasaGenero = (p: Producto) => {
        const cat = (p.category || "").trim().toUpperCase();
        const gen = (p.gender || "UNISEX").trim().toUpperCase();
        const elegidos = selectedGenders.map(g => g.trim().toUpperCase());
        if (elegidos.includes(gen)) return true;
        // Los de ambiente suelen tener el género mal cargado: alcanza con que esté elegida su categoría
        if (esAmbiente(cat)) return pasaCategoria(p) || elegidos.includes("AMBIENTE") || (gen === "UNISEX" && elegidos.length > 0);
        return false;
    };

    const filteredData = productos.filter(p => conPrecio(p) && pasaStock(p) && pasaCategoria(p) && pasaGenero(p));
    const cuentaStock = (s: Stock) => productos.filter(p => conPrecio(p) && pasaStock(p, s) && pasaCategoria(p) && pasaGenero(p)).length;
    const cuentaCategoria = (cat: string) => productos.filter(p => conPrecio(p) && pasaStock(p) && pasaGenero(p)
        && (p.category || "").trim().toUpperCase() === cat.trim().toUpperCase()).length;
    const enStock = filteredData.filter(p => auto(p).estado === "disponible").length;

    const alternar = (lista: string[], valor: string) => lista.includes(valor) ? lista.filter(x => x !== valor) : [...lista, valor];

    const exportar = async () => {
        if (generando) return;
        setGenerando(true);
        try {
            // La lista sale con la disponibilidad automática (o sin esa columna, si se pidió)
            const datos = filteredData.map(p => {
                const a = auto(p);
                if (!mostrarDisponibilidad) return { ...p, availabilityStatus: "disponible" as const, deliveryDays: 0 };
                return {
                    ...p,
                    availabilityStatus: a.estado === "sin-stock" ? "no-disponible" as const : a.estado,
                    deliveryDays: a.dias,
                };
            });
            await onExport(datos, type);
        } finally {
            setGenerando(false);
        }
    };

    const titulo = "text-xs font-semibold uppercase tracking-[0.12em] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45";

    return (
        <Ventana abierta={isOpen} onCerrar={generando ? undefined : onClose} etiqueta="Exportar lista de precios">
            <PanelVentana ancho="md">
                <CabeceraVentana
                    etiqueta={type === "excel" ? "Exportar a Excel" : "Exportar a PDF"}
                    titulo={lista ? `Lista ${lista.toLowerCase()}` : "Lista de precios"}
                    descripcion={type === "excel" ? "Planilla por categoría, con los precios como números." : "Documento listo para mandar por WhatsApp."}
                    icono={type === "excel" ? FileSpreadsheet : FileText}
                    tono={type === "excel" ? "salvia" : "terracota"}
                    onCerrar={onClose}
                    cerrarDeshabilitado={generando}
                />

                <CuerpoVentana className="space-y-5">
                    {/* Qué productos según el stock */}
                    <section>
                        <p className={titulo}>Qué productos</p>
                        <div role="radiogroup" aria-label="Stock" className="mt-2 grid grid-cols-3 gap-2">
                            {OPCIONES_STOCK.map(o => {
                                const activo = stock === o.key;
                                return (
                                    <button
                                        key={o.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={activo}
                                        onClick={() => setStock(o.key)}
                                        className={`text-left rounded-xl border px-3 py-2.5 active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo
                                            ? "border-[#7D9878] bg-[#7D9878]/[0.08] dark:bg-[#7D9878]/[0.14]"
                                            : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50"}`}
                                    >
                                        <span className="flex items-center justify-between gap-2">
                                            <span className={`flex items-center gap-1.5 text-sm font-semibold ${activo ? "text-[#3F5A3C] dark:text-[#C5D6BF]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                                <o.Icono className="w-4 h-4" />
                                                {o.titulo}
                                            </span>
                                            <span className="text-xs tabular-nums text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{cuentaStock(o.key)}</span>
                                        </span>
                                        <span className="block mt-0.5 text-[11px] leading-snug text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{o.detalle}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between gap-3">
                            <p className={titulo}>Categorías</p>
                            <TodoNada onTodo={() => setSelectedCategories(availableCategories)} onNada={() => setSelectedCategories([])} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {availableCategories.map(cat => {
                                const elegida = selectedCategories.includes(cat);
                                return (
                                    <button key={cat} type="button" aria-pressed={elegida} onClick={() => setSelectedCategories(alternar(selectedCategories, cat))} className={chip(elegida)}>
                                        {elegida && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                        {cat}
                                        <span className="text-[11px] tabular-nums opacity-60">{cuentaCategoria(cat)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between gap-3">
                            <p className={titulo}>Géneros</p>
                            <TodoNada onTodo={() => setSelectedGenders(availableGenders)} onNada={() => setSelectedGenders([])} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {availableGenders.map(gen => {
                                const elegido = selectedGenders.includes(gen);
                                return (
                                    <button key={gen} type="button" aria-pressed={elegido} onClick={() => setSelectedGenders(alternar(selectedGenders, gen))} className={chip(elegido)}>
                                        {elegido && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                        {gen}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] px-3.5 py-1.5 divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                        <Casilla
                            activo={mostrarDisponibilidad}
                            onCambiar={setMostrarDisponibilidad}
                            titulo="Mostrar la disponibilidad"
                            detalle="Columna con «Disponible», «Demora 7 días» o «Sin stock», según tu stock de hoy"
                        />
                        <Casilla
                            activo={incluirSinStock}
                            onCambiar={setIncluirSinStock}
                            titulo="Incluir productos sin stock"
                            detalle="Los que tienen la esencia a consultar con el proveedor"
                        />
                        <Casilla
                            activo={incluirSinPrecio}
                            onCambiar={setIncluirSinPrecio}
                            titulo="Incluir productos sin precio"
                            detalle="Salen como «Consultar»"
                        />
                    </section>
                </CuerpoVentana>

                <PieVentana>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                        <span className="font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{filteredData.length}</span>
                        {filteredData.length === 1 ? " producto" : " productos"}
                        {filteredData.length > 0 && stock === "todo" && <span className="text-xs"> · {enStock} con stock</span>}
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} disabled={generando} className={BOTON_SECUNDARIO}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={exportar}
                            disabled={filteredData.length === 0 || generando}
                            aria-busy={generando}
                            className={BOTON_PRINCIPAL}
                        >
                            {generando
                                ? <LoaderCircle className="w-4 h-4 animate-spin" />
                                : type === "excel" ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            {generando ? "Generando…" : type === "excel" ? "Descargar Excel" : "Descargar PDF"}
                        </button>
                    </div>
                </PieVentana>
            </PanelVentana>
        </Ventana>
    );
}
