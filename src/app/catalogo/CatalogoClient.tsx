"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Search, Plus, Minus, ShoppingBag, X, MessageCircle, Clock, Trash2, Check, ChevronLeft, ChevronRight, Car, Wind, SprayCan, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format-utils";
import { extractBrand } from "@/lib/product-utils";

export type CatalogoProducto = {
    id: string;
    name: string;
    category: string;
    gender: string;
    description: string;
    price: number;
    availability: "disponible" | "demora" | "sin-stock";
    deliveryDays: number;
    foto: string | null;
};

const WHATSAPP_NUMBER = "5491123529147";
const STORAGE_KEY = "catalogo_consulta";
const PAGE_SIZE = 12; // múltiplo de 2 y de 3: las filas quedan completas en celular, tablet y compu

// "Frascos de 50 ML" -> "50 ML", "Frascos Difusores" -> "Difusores": más corto para los botones de filtro.
const etiquetaCategoria = (c: string) => c.replace(/^frascos\s+(de\s+)?/i, "");

// Números de página a mostrar: siempre la primera y la última, y dos a cada lado de la actual.
function paginasVisibles(actual: number, total: number): (number | "…")[] {
    const out: (number | "…")[] = [];
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - actual) <= 1) out.push(i);
        else if (out[out.length - 1] !== "…") out.push("…");
    }
    return out;
}

type Consulta = Record<string, number>; // id de producto -> cantidad

const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export default function CatalogoClient({ productos }: { productos: CatalogoProducto[] | null }) {
    const [search, setSearch] = useState("");
    const [gender, setGender] = useState("Todos");
    const [category, setCategory] = useState("Todas");
    const [page, setPage] = useState(1);
    const gridRef = useRef<HTMLDivElement>(null);
    const [consulta, setConsulta] = useState<Consulta>({});
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Recupera la consulta armada en una visita anterior (solo en este navegador).
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setConsulta(JSON.parse(saved));
        } catch { }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(consulta));
        } catch { }
    }, [consulta]);

    useEffect(() => {
        document.body.style.overflow = drawerOpen ? "hidden" : "";
        // Escape cierra el panel del pedido
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
        if (drawerOpen) document.addEventListener("keydown", alTeclear);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", alTeclear);
        };
    }, [drawerOpen]);

    const lista = productos ?? [];
    const byId = useMemo(() => new Map(lista.map(p => [p.id, p])), [lista]);

    const genders = useMemo(() => {
        const set = new Set(lista.map(p => p.gender).filter(Boolean));
        return ["Todos", ...Array.from(set).sort()];
    }, [lista]);

    const categories = useMemo(() => {
        const set = new Set(lista.map(p => p.category).filter(Boolean));
        // Ordenadas por la etiqueta que se ve: 30 ML, 50 ML, Auto, Difusores.
        return ["Todas", ...Array.from(set).sort((a, b) =>
            etiquetaCategoria(a).localeCompare(etiquetaCategoria(b), "es", { numeric: true }))];
    }, [lista]);

    const q = search.trim().toLowerCase();
    const coincideBusqueda = (p: CatalogoProducto) =>
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);

    const filtered = useMemo(() => lista.filter(p =>
        (gender === "Todos" || p.gender === gender) &&
        (category === "Todas" || p.category === category) &&
        coincideBusqueda(p)
    ), [lista, q, gender, category]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cantidad de productos que quedarían al tocar cada botón (respetando el otro filtro y la búsqueda).
    const cuentaGenero = useMemo(() => {
        const base = lista.filter(p => (category === "Todas" || p.category === category) && coincideBusqueda(p));
        const c: Record<string, number> = { Todos: base.length };
        for (const p of base) c[p.gender] = (c[p.gender] ?? 0) + 1;
        return c;
    }, [lista, q, category]); // eslint-disable-line react-hooks/exhaustive-deps

    const cuentaCategoria = useMemo(() => {
        const base = lista.filter(p => (gender === "Todos" || p.gender === gender) && coincideBusqueda(p));
        const c: Record<string, number> = { Todas: base.length };
        for (const p of base) c[p.category] = (c[p.category] ?? 0) + 1;
        return c;
    }, [lista, q, gender]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const hayFiltros = gender !== "Todos" || category !== "Todas" || q !== "";

    useEffect(() => { setPage(1); }, [search, gender, category]);

    const irAPagina = (n: number) => {
        setPage(Math.min(Math.max(1, n), totalPages));
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const limpiarFiltros = () => {
        setSearch("");
        setGender("Todos");
        setCategory("Todas");
    };

    // Solo cuenta productos que siguen en el catálogo (por si alguno se dio de baja).
    const items = useMemo(
        () => Object.entries(consulta)
            .map(([id, qty]) => ({ producto: byId.get(id), qty }))
            .filter((i): i is { producto: CatalogoProducto; qty: number } => !!i.producto && i.qty > 0),
        [consulta, byId]
    );
    const totalUnidades = items.reduce((acc, i) => acc + i.qty, 0);
    const total = items.reduce((acc, i) => acc + i.qty * i.producto.price, 0);

    const setQty = (id: string, qty: number) => {
        setConsulta(prev => {
            const next = { ...prev };
            if (qty <= 0) delete next[id];
            else next[id] = qty;
            return next;
        });
    };

    const mensajePedido = () => {
        const lineas = items.map(({ producto, qty }) =>
            // El género va en el mensaje: hay perfumes con el mismo nombre en versión de hombre y de mujer.
            `• ${qty} x ${producto.name}${producto.gender ? ` - ${producto.gender}` : ""} ($${formatNumber(producto.price)} c/u)`
        );
        return [
            "¡Hola Scenta! Quiero consultar por este pedido:",
            "",
            ...lineas,
            "",
            `Total estimado: $${formatNumber(total)}`,
        ].join("\n");
    };

    return (
        <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] font-sans">
            {/* Encabezado */}
            <header className="border-b border-[#E6DFD5] dark:border-[#353B33] bg-white/70 dark:bg-[#242723]/70 backdrop-blur-md sticky top-0 z-30">
                {/* Tres columnas: la del medio centra el título aunque el botón ocupe lugar a la derecha */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div />
                    <a href="/catalogo" className="flex items-center gap-3">
                        <img src="/logo-scenta.png" alt="" className="h-10 w-auto object-contain dark:invert dark:brightness-200" />
                        <div className="text-left">
                            <h1 className="font-brand text-xl sm:text-2xl font-bold tracking-[0.25em] leading-none">SCENTA</h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#7D9878] dark:text-[#A3B69B] mt-1">Fragancias naturales</p>
                        </div>
                    </a>
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="relative justify-self-end flex items-center gap-2 rounded-full bg-[#7D9878] hover:bg-[#6B8566] text-white px-4 py-2.5 text-sm font-bold transition-colors"
                        aria-label="Ver mi pedido"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline">Mi pedido</span>
                        {totalUnidades > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#C9866F] text-white text-[11px] font-black flex items-center justify-center">
                                {totalUnidades}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Bienvenida */}
            <section className="relative overflow-hidden border-b border-[#E6DFD5] dark:border-[#353B33]">
                <div className="absolute inset-0 bg-[radial-gradient(#DAC4AA_1px,transparent_1px)] dark:bg-[radial-gradient(#353B33_1px,transparent_1px)] [background-size:22px_22px] opacity-50 pointer-events-none" />
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[320px] rounded-full bg-[#A3B69B]/20 dark:bg-[#7D9878]/10 blur-3xl pointer-events-none" />
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7D9878]/30 bg-white/70 dark:bg-[#242723]/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#7D9878] dark:text-[#A3B69B]">
                        <Sparkles className="w-3 h-3" /> Catálogo
                    </span>
                    <h2 className="font-brand text-3xl sm:text-5xl font-bold mt-4 leading-tight">
                        Fragancias para vos, <span className="text-[#7D9878] dark:text-[#A3B69B]">tu casa y tu auto</span>
                    </h2>
                    <p className="text-sm sm:text-base text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 mt-3 max-w-xl mx-auto">
                        Elegí tus perfumes, armá el pedido y te lo confirmamos por WhatsApp.
                    </p>
                </div>
            </section>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-32">
                {productos === null ? (
                    <EstadoVacio
                        titulo="El catálogo no está disponible en este momento"
                        texto="Escribinos por WhatsApp y te pasamos los productos y precios."
                        accion={whatsappUrl("¡Hola Scenta! Quería consultar por sus productos.")}
                    />
                ) : (
                    <>
                        {/* Filtros */}
                        <section className="mb-6 rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] p-4 sm:p-5 space-y-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar perfume, aroma o marca..."
                                    className="w-full rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7D9878]/40"
                                />
                            </div>

                            <FilaFiltro titulo="Género">
                                {genders.map(g => (
                                    <ChipFiltro
                                        key={g}
                                        activo={gender === g}
                                        cantidad={cuentaGenero[g] ?? 0}
                                        onClick={() => setGender(g)}
                                    >
                                        {g}
                                    </ChipFiltro>
                                ))}
                            </FilaFiltro>

                            {categories.length > 2 && (
                                <FilaFiltro titulo="Categoría">
                                    {categories.map(c => (
                                        <ChipFiltro
                                            key={c}
                                            activo={category === c}
                                            cantidad={cuentaCategoria[c] ?? 0}
                                            onClick={() => setCategory(c)}
                                        >
                                            {c === "Todas" ? "Todas" : etiquetaCategoria(c)}
                                        </ChipFiltro>
                                    ))}
                                </FilaFiltro>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E6DFD5] dark:border-[#353B33] text-xs">
                                <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                                    {filtered.length === 0
                                        ? "Sin resultados"
                                        : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} productos`}
                                </p>
                                {hayFiltros && (
                                    <button onClick={limpiarFiltros} className="font-bold text-[#7D9878] dark:text-[#A3B69B] hover:underline">
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </section>

                        {filtered.length === 0 ? (
                            <EstadoVacio
                                titulo="No encontramos productos con esa búsqueda"
                                texto="Probá con otro nombre o consultanos directamente."
                                accion={whatsappUrl(`¡Hola Scenta! Estoy buscando: ${search}`)}
                            />
                        ) : (
                            <>
                                <div ref={gridRef} className="scroll-mt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pageItems.map(p => (
                                        <TarjetaProducto
                                            key={p.id}
                                            producto={p}
                                            qty={consulta[p.id] ?? 0}
                                            onQty={qty => setQty(p.id, qty)}
                                        />
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Páginas">
                                        <button
                                            onClick={() => irAPagina(page - 1)}
                                            disabled={page === 1}
                                            className="flex items-center gap-1 rounded-full px-3 h-10 text-sm font-bold border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] hover:border-[#7D9878] disabled:opacity-40 disabled:hover:border-[#E6DFD5] transition-colors"
                                            aria-label="Página anterior"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span className="hidden sm:inline">Anterior</span>
                                        </button>
                                        {paginasVisibles(page, totalPages).map((n, i) => n === "…" ? (
                                            <span key={`e${i}`} className="w-8 text-center text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">…</span>
                                        ) : (
                                            <button
                                                key={n}
                                                onClick={() => irAPagina(n)}
                                                aria-current={n === page ? "page" : undefined}
                                                className={`min-w-10 h-10 rounded-full text-sm font-bold transition-colors ${n === page
                                                    ? "bg-[#7D9878] text-white"
                                                    : "border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] hover:border-[#7D9878]"}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => irAPagina(page + 1)}
                                            disabled={page === totalPages}
                                            className="flex items-center gap-1 rounded-full px-3 h-10 text-sm font-bold border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] hover:border-[#7D9878] disabled:opacity-40 disabled:hover:border-[#E6DFD5] transition-colors"
                                            aria-label="Página siguiente"
                                        >
                                            <span className="hidden sm:inline">Siguiente</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}
                    </>
                )}
                <footer className="mt-16 pt-8 border-t border-[#E6DFD5] dark:border-[#353B33] flex flex-col items-center gap-3 text-center">
                    <img src="/logo-scenta.png" alt="Scenta" className="h-12 w-auto object-contain opacity-80 dark:invert dark:brightness-200" />
                    <p className="font-brand text-sm tracking-[0.25em]">SCENTA</p>
                    <a
                        href={whatsappUrl("¡Hola Scenta! Quería hacerles una consulta.")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7D9878] dark:text-[#A3B69B] hover:underline"
                    >
                        <MessageCircle className="w-3.5 h-3.5" /> Escribinos por WhatsApp
                    </a>
                    <a href="/login" className="text-[11px] text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35 hover:text-[#7D9878] transition-colors">
                        Acceso para el equipo
                    </a>
                </footer>
            </main>

            {/* Barra inferior con el resumen del pedido */}
            {totalUnidades > 0 && !drawerOpen && (
                <div className="fixed bottom-0 inset-x-0 z-30 p-4">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="max-w-xl mx-auto w-full flex items-center justify-between gap-3 rounded-2xl bg-[#242723] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] px-5 py-4 shadow-2xl"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold">
                            <ShoppingBag className="w-4 h-4" />
                            {totalUnidades} {totalUnidades === 1 ? "producto" : "productos"} · ${formatNumber(total)}
                        </span>
                        <span className="text-sm font-black text-[#A3B69B] dark:text-[#6B8566]">Ver pedido →</span>
                    </button>
                </div>
            )}

            {/* Panel del pedido: entra desde la derecha con la curva de los paneles de iOS */}
            <MotionConfig reducedMotion="user">
            <AnimatePresence>
            {drawerOpen && (
                <div key="panel-pedido" className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Mi pedido">
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.25 } }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        onClick={() => setDrawerOpen(false)}
                    />
                    <motion.aside
                        className="relative w-full max-w-md h-full bg-[#F9F6F0] dark:bg-[#1B1D1A] flex flex-col shadow-2xl"
                        initial={{ transform: "translateX(100%)" }}
                        animate={{ transform: "translateX(0%)", transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] } }}
                        exit={{ transform: "translateX(100%)", transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] } }}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6DFD5] dark:border-[#353B33]">
                            <h2 className="font-brand text-xl font-bold">Mi pedido</h2>
                            <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-[#E6DFD5] dark:hover:bg-[#353B33]" aria-label="Cerrar">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-2">
                                <ShoppingBag className="w-10 h-10 text-[#7D9878]" />
                                <p className="font-bold">Todavía no agregaste productos</p>
                                <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Tocá “Agregar” en los productos que te interesen.</p>
                            </div>
                        ) : (
                            <>
                                <ul className="flex-1 overflow-y-auto divide-y divide-[#E6DFD5] dark:divide-[#353B33] px-5">
                                    {items.map(({ producto, qty }) => (
                                        <li key={producto.id} className="py-4 flex gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm leading-snug">{producto.name}</p>
                                                <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-0.5">${formatNumber(producto.price)} c/u</p>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <Stepper qty={qty} onQty={q => setQty(producto.id, q)} />
                                                    <button onClick={() => setQty(producto.id, 0)} className="text-xs text-[#B5735C] hover:underline flex items-center gap-1">
                                                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="font-black text-sm whitespace-nowrap">${formatNumber(qty * producto.price)}</p>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t border-[#E6DFD5] dark:border-[#353B33] p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">Total estimado</span>
                                        <span className="text-xl font-black">${formatNumber(total)}</span>
                                    </div>
                                    <p className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                                        Te confirmamos disponibilidad, precio final y envío por WhatsApp.
                                    </p>
                                    <a
                                        href={whatsappUrl(mensajePedido())}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#7D9878] hover:bg-[#6B8566] text-white py-3.5 font-bold transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        Consultar pedido por WhatsApp
                                    </a>
                                </div>
                            </>
                        )}
                    </motion.aside>
                </div>
            )}
            </AnimatePresence>
            </MotionConfig>
        </div>
    );
}

function FilaFiltro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="sm:w-24 shrink-0 text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                {titulo}
            </span>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function ChipFiltro({ activo, cantidad, onClick, children }: { activo: boolean; cantidad: number; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            disabled={!activo && cantidad === 0}
            aria-pressed={activo}
            className={`inline-flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold border transition-all disabled:opacity-35 disabled:cursor-not-allowed ${activo
                ? "bg-[#7D9878] border-[#7D9878] text-white shadow-sm shadow-[#7D9878]/30"
                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878] hover:text-[#7D9878] dark:hover:text-[#A3B69B]"}`}
        >
            {activo && <Check className="w-3.5 h-3.5 -ml-0.5" />}
            {children}
            <span className={`min-w-5 px-1.5 rounded-full text-[10px] font-black text-center ${activo
                ? "bg-white/25 text-white"
                : "bg-[#E6DFD5] dark:bg-[#353B33] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}>
                {cantidad}
            </span>
        </button>
    );
}

// Estilo visual de la tarjeta según el tipo de producto: cuando no tiene foto, un recuadro con
// degradé de la paleta Scenta + ícono + tamaño identifica cada producto de un vistazo.
function estiloProducto(p: CatalogoProducto) {
    const tipo = etiquetaCategoria(p.category || "").toLowerCase();
    const g = (p.gender || "").toLowerCase();
    const formato = tipo.includes("auto") ? "Auto" : tipo.includes("difusor") ? "Difusor" : etiquetaCategoria(p.category || "");
    const Icono = tipo.includes("auto") ? Car : tipo.includes("difusor") ? Wind : SprayCan;
    const fondo =
        g.startsWith("fem") ? "from-[#C9866F]/25 via-[#DAC4AA]/20 to-[#F4EFEA]/10 dark:from-[#C9866F]/25 dark:via-[#C9866F]/10 dark:to-transparent" :
        g.startsWith("masc") ? "from-[#7D9878]/30 via-[#A3B69B]/15 to-[#F4EFEA]/10 dark:from-[#7D9878]/30 dark:via-[#7D9878]/10 dark:to-transparent" :
        g.startsWith("uni") ? "from-[#A3B69B]/25 via-[#DAC4AA]/20 to-[#F4EFEA]/10 dark:from-[#A3B69B]/20 dark:via-[#DAC4AA]/10 dark:to-transparent" :
        "from-[#DAC4AA]/40 via-[#E6DFD5]/30 to-[#F4EFEA]/10 dark:from-[#DAC4AA]/20 dark:via-[#DAC4AA]/5 dark:to-transparent";
    const acento =
        g.startsWith("fem") ? "text-[#B5735C] dark:text-[#D29680]" :
        g.startsWith("masc") ? "text-[#5A7356] dark:text-[#A3B69B]" :
        "text-[#7F7D74] dark:text-[#DAC4AA]";
    return { formato, Icono, fondo, acento };
}

function TarjetaProducto({ producto, qty, onQty }: { producto: CatalogoProducto; qty: number; onQty: (qty: number) => void }) {
    const { title, brand } = extractBrand(producto.name);
    // El tamaño o formato ya se muestra en la etiqueta del recuadro: no repetirlo en el nombre.
    const nombre = title.replace(/\s+(\d+\s*ML|DIFUSOR|AUTO)\s*$/i, "").trim() || title;
    const { formato, Icono, fondo, acento } = estiloProducto(producto);
    const enPedido = qty > 0;
    const sinStock = producto.availability === "sin-stock";

    return (
        <article className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white dark:bg-[#242723] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2C2C2C]/5 dark:hover:shadow-black/30 ${enPedido
            ? "border-[#7D9878] ring-1 ring-[#7D9878]/40"
            : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#A3B69B]/60"}`}
        >
            {/* Recuadro visual: la foto si hay; si no, degradé con el ícono del tipo */}
            <div className={`relative h-40 overflow-hidden flex items-center justify-center ${producto.foto ? "bg-white" : `bg-gradient-to-br ${fondo}`}`}>
                {producto.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={producto.foto}
                        alt={producto.name}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105 ${sinStock ? "opacity-50 grayscale" : ""}`}
                    />
                ) : (
                    <Icono className={`w-10 h-10 ${acento} opacity-70 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.4} />
                )}
                <span className="absolute top-3 left-3 rounded-full bg-white/80 dark:bg-[#1B1D1A]/70 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
                    {formato}
                </span>
                {producto.gender && (
                    <span className={`absolute top-3 right-3 rounded-full bg-white/80 dark:bg-[#1B1D1A]/70 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${acento}`}>
                        {producto.gender}
                    </span>
                )}
                {enPedido && (
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-[#7D9878] text-white px-2.5 py-1 text-[10px] font-black">
                        <Check className="w-3 h-3" /> {qty} en tu pedido
                    </span>
                )}
                {sinStock && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#C9866F] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
                        Sin stock
                    </span>
                )}
            </div>

            <div className="flex-1 flex flex-col gap-1 p-5">
                {brand && (
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7D9878] dark:text-[#A3B69B]">{brand}</p>
                )}
                <h3 className="font-brand text-lg font-bold leading-snug">{nombre}</h3>
                {producto.description && (
                    <p className="text-sm text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 line-clamp-2 mt-1">{producto.description}</p>
                )}
                {producto.availability === "demora" && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B5735C] dark:text-[#D29680] mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {producto.deliveryDays > 0 ? `Entrega en ${producto.deliveryDays} días` : "Entrega con demora"}
                    </p>
                )}

                <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">Precio</p>
                        <p className="text-xl font-black tracking-tight">${formatNumber(producto.price)}</p>
                    </div>
                    {sinStock && !enPedido ? (
                        <span className="rounded-full border border-[#E6DFD5] dark:border-[#353B33] px-4 py-2.5 text-sm font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">
                            Sin stock
                        </span>
                    ) : enPedido ? (
                        <Stepper qty={qty} onQty={onQty} />
                    ) : (
                        <button
                            onClick={() => onQty(1)}
                            className="flex items-center gap-1.5 rounded-full bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] hover:bg-[#7D9878] dark:hover:bg-[#A3B69B] px-4 py-2.5 text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

function Stepper({ qty, onQty }: { qty: number; onQty: (qty: number) => void }) {
    return (
        <div className="flex items-center rounded-full border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A]">
            <button onClick={() => onQty(qty - 1)} className="p-2 hover:text-[#7D9878]" aria-label="Quitar uno">
                <Minus className="w-4 h-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-black">{qty}</span>
            <button onClick={() => onQty(qty + 1)} className="p-2 hover:text-[#7D9878]" aria-label="Agregar uno">
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}

function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion: string }) {
    return (
        <div className="text-center py-20 px-6 max-w-md mx-auto space-y-3">
            <p className="font-bold text-lg">{titulo}</p>
            <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">{texto}</p>
            <a
                href={accion}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#7D9878] hover:bg-[#6B8566] text-white px-5 py-2.5 text-sm font-bold transition-colors"
            >
                <MessageCircle className="w-4 h-4" /> Escribinos por WhatsApp
            </a>
        </div>
    );
}
