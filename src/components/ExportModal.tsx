"use client";

import { Check, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Producto, useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TodoNada, FilaInterruptor, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";

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
        stock?: FiltroStock;
    };
    type: "excel" | "pdf";
    /** Nombre de la lista que se exporta (Minorista o Mayorista) */
    lista?: string;
}

// Mismos valores que el filtro "Stock" de la lista de precios
export type FiltroStock = "todos" | "disponible" | "demora" | "sin-stock";

// El punto de color es el mismo que la columna "Stock" de la lista
const OPCIONES_STOCK: { key: FiltroStock; titulo: string; detalle: string; punto: string }[] = [
    { key: "todos", titulo: "Todo", detalle: "En stock y con demora", punto: "bg-[#2C2C2C]/30 dark:bg-[#F4EFEA]/35" },
    { key: "disponible", titulo: "En stock", detalle: "Perfumes hechos, se entregan ya", punto: "bg-[#1baf7a]" },
    { key: "demora", titulo: "Con demora", detalle: "Hay que prepararlos antes de entregar", punto: "bg-[#C9A877]" },
    { key: "sin-stock", titulo: "Sin stock", detalle: "La esencia hay que consultarla con el proveedor", punto: "bg-[#C9866F]" },
];

// "Frascos de 30 ML" → "30 ml", "Frascos Difusores" → "Difusores": en el botón alcanza con lo que los distingue
const nombreCorto = (cat: string) => {
    const corto = cat.replace(/^frascos?\s+(de\s+)?/i, "").trim() || cat;
    return corto.replace(/(\d)\s*ML\b/i, "$1 ml");
};

// Pista con las opciones adentro, igual que "Qué productos" pero se pueden elegir varias:
// las elegidas se levantan como una pastilla clara, las otras quedan apagadas sobre el fondo.
function PistaFiltros({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return (
        <div role="group" aria-label={etiqueta} className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] border border-[#E6DFD5]/70 dark:border-[#353B33]/70">
            {children}
        </div>
    );
}

// Si con los otros filtros no tiene productos, se ve muy apagada, sin pastilla y no se puede tocar.
function OpcionFiltro({ nombre, titulo, cantidad, elegida, onAlternar }: { nombre: string; titulo?: string; cantidad: number; elegida: boolean; onAlternar: () => void }) {
    const vacia = cantidad === 0;
    const marcada = elegida && !vacia;
    return (
        <button
            type="button"
            aria-pressed={marcada}
            disabled={vacia}
            onClick={onAlternar}
            title={vacia ? "No hay productos con estos filtros" : titulo}
            className="relative h-14 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-35 transition-[transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
        >
            <AnimatePresence initial={false}>
                {marcada && (
                    <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-white dark:bg-[#2E332D] shadow-sm shadow-black/[0.06] ring-1 ring-[#E6DFD5] dark:ring-[#3F463D]"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                    />
                )}
            </AnimatePresence>
            <span className={`relative flex items-center gap-1.5 max-w-full text-[13px] font-semibold transition-colors duration-150 ${marcada ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45"}`}>
                <Check className={`w-3.5 h-3.5 shrink-0 text-[#7D9878] dark:text-[#A3B69B] transition-[opacity,transform] duration-150 ease-out ${marcada ? "opacity-100 scale-100" : "opacity-0 scale-50 -mr-5"}`} strokeWidth={3} />
                <span className="truncate">{nombre}</span>
            </span>
            <span className={`relative text-xs tabular-nums transition-colors duration-150 ${marcada ? "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60" : "text-[#2C2C2C]/35 dark:text-[#F4EFEA]/30"}`}>
                {cantidad} {cantidad === 1 ? "producto" : "productos"}
            </span>
        </button>
    );
}

const TITULO_SECCION = "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40";

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
    const [stock, setStock] = useState<FiltroStock>("todos");
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
    const { category: catInicial, gender: generoInicial, showConsult: sinPrecioInicial, showOutOfStock: sinStockInicial, stock: stockInicial } = initialFilters;
    const iniciales = useRef({ catInicial, generoInicial, sinPrecioInicial, sinStockInicial, stockInicial, availableCategories, availableGenders });
    iniciales.current = { catInicial, generoInicial, sinPrecioInicial, sinStockInicial, stockInicial, availableCategories, availableGenders };
    useEffect(() => {
        if (!isOpen) return;
        const i = iniciales.current;
        setSelectedCategories(i.catInicial && i.catInicial !== "Todas" ? [i.catInicial] : i.availableCategories);
        setSelectedGenders(i.generoInicial && i.generoInicial !== "Todos" ? [i.generoInicial] : i.availableGenders);
        setIncluirSinPrecio(i.sinPrecioInicial || false);
        setIncluirSinStock(i.sinStockInicial || false);
        setStock(i.stockInicial ?? "todos");
    }, [isOpen]);

    // Filtros por separado, así cada grupo cuenta cuántos quedarían
    const conPrecio = (p: Producto) => {
        const precio = Number(lista === "Mayorista" ? p.price : p.priceMinorista);
        return incluirSinPrecio || (Number.isFinite(precio) && precio > 0);
    };
    // En "Todo", los sin stock salen solo si está marcada la casilla
    const pasaStock = (p: Producto, s: FiltroStock = stock) => {
        const estado = auto(p).estado;
        if (s === "todos") return estado !== "sin-stock" || incluirSinStock;
        return estado === s;
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
    const cuentaStock = (s: FiltroStock) => productos.filter(p => conPrecio(p) && pasaStock(p, s) && pasaCategoria(p) && pasaGenero(p)).length;
    const cuentaCategoria = (cat: string) => productos.filter(p => conPrecio(p) && pasaStock(p) && pasaGenero(p)
        && (p.category || "").trim().toUpperCase() === cat.trim().toUpperCase()).length;
    // Los de ambiente cuentan en "Ambiente" aunque tengan otro género cargado
    const generoDe = (p: Producto) => esAmbiente((p.category || "").trim().toUpperCase()) ? "AMBIENTE" : (p.gender || "UNISEX").trim().toUpperCase();
    const cuentaGenero = (gen: string) => productos.filter(p => conPrecio(p) && pasaStock(p) && pasaCategoria(p)
        && generoDe(p) === gen.trim().toUpperCase()).length;
    const enStock = filteredData.filter(p => auto(p).estado === "disponible").length;
    const conDemora = filteredData.filter(p => auto(p).estado === "demora").length;
    const sinMovimiento = useReducedMotion();

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

    const opcionStock = OPCIONES_STOCK.find(o => o.key === stock) ?? OPCIONES_STOCK[0];

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

                <CuerpoVentana className="space-y-7">
                    {/* Qué productos según el stock: control segmentado con la pastilla que se desliza */}
                    <section>
                        <p className={TITULO_SECCION}>Qué productos</p>
                        <div role="radiogroup" aria-label="Stock" className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] border border-[#E6DFD5]/70 dark:border-[#353B33]/70">
                            {OPCIONES_STOCK.map(o => {
                                const activo = stock === o.key;
                                const cantidad = cuentaStock(o.key);
                                return (
                                    <button
                                        key={o.key}
                                        type="button"
                                        role="radio"
                                        aria-checked={activo}
                                        onClick={() => setStock(o.key)}
                                        className="relative h-14 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                                    >
                                        {activo && (
                                            <motion.span
                                                layoutId="pastilla-stock"
                                                aria-hidden
                                                className="absolute inset-0 rounded-xl bg-white dark:bg-[#2E332D] shadow-sm shadow-black/[0.06] ring-1 ring-[#E6DFD5] dark:ring-[#3F463D]"
                                                transition={sinMovimiento ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0.15 }}
                                            />
                                        )}
                                        <span className={`relative flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ${activo ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50"}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${o.punto}`} />
                                            {o.titulo}
                                        </span>
                                        <span className={`relative text-xs tabular-nums transition-colors duration-150 ${activo ? "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60" : "text-[#2C2C2C]/35 dark:text-[#F4EFEA]/30"}`}>
                                            {cantidad} {cantidad === 1 ? "producto" : "productos"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2.5 px-1 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{opcionStock.detalle}.</p>
                    </section>

                    <section>
                        <div className="flex items-center justify-between gap-3">
                            <p className={TITULO_SECCION}>Categorías</p>
                            <TodoNada onTodo={() => setSelectedCategories(availableCategories)} onNada={() => setSelectedCategories([])} />
                        </div>
                        <PistaFiltros etiqueta="Categorías">
                            {availableCategories.map(cat => (
                                <OpcionFiltro
                                    key={cat}
                                    nombre={nombreCorto(cat)}
                                    titulo={cat}
                                    cantidad={cuentaCategoria(cat)}
                                    elegida={selectedCategories.includes(cat)}
                                    onAlternar={() => setSelectedCategories(alternar(selectedCategories, cat))}
                                />
                            ))}
                        </PistaFiltros>
                    </section>

                    <section>
                        <div className="flex items-center justify-between gap-3">
                            <p className={TITULO_SECCION}>Géneros</p>
                            <TodoNada onTodo={() => setSelectedGenders(availableGenders)} onNada={() => setSelectedGenders([])} />
                        </div>
                        <PistaFiltros etiqueta="Géneros">
                            {availableGenders.map(gen => (
                                <OpcionFiltro
                                    key={gen}
                                    nombre={gen}
                                    cantidad={cuentaGenero(gen)}
                                    elegida={selectedGenders.includes(gen)}
                                    onAlternar={() => setSelectedGenders(alternar(selectedGenders, gen))}
                                />
                            ))}
                        </PistaFiltros>
                    </section>

                    <section className="space-y-2">
                        <p className={`${TITULO_SECCION} mb-3`}>Opciones</p>
                        <FilaInterruptor
                            activo={mostrarDisponibilidad}
                            onCambiar={setMostrarDisponibilidad}
                            titulo="Mostrar la disponibilidad"
                            descripcion="Columna con «Disponible», «Demora 7 días» o «Sin stock»"
                        />
                        {stock === "todos" && (
                            <FilaInterruptor
                                activo={incluirSinStock}
                                onCambiar={setIncluirSinStock}
                                titulo="Incluir productos sin stock"
                                descripcion="Los que tienen la esencia a consultar"
                            />
                        )}
                        <FilaInterruptor
                            activo={incluirSinPrecio}
                            onCambiar={setIncluirSinPrecio}
                            titulo="Incluir productos sin precio"
                            descripcion="Salen como «Consultar»"
                        />
                    </section>
                </CuerpoVentana>

                <PieVentana>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 min-w-0">
                        <span className="block font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                            {filteredData.length} {filteredData.length === 1 ? "producto" : "productos"}
                        </span>
                        {filteredData.length > 0 && stock === "todos" && (
                            <span className="block text-xs tabular-nums">{enStock} en stock · {conDemora} con demora</span>
                        )}
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
