"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Minus, ShoppingBag, X, MessageCircle, Clock, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/format-utils";
import { extractBrand } from "@/lib/product-utils";

export type CatalogoProducto = {
    id: string;
    name: string;
    category: string;
    gender: string;
    description: string;
    price: number;
    availability: "disponible" | "demora";
    deliveryDays: number;
};

const WHATSAPP_NUMBER = "5491123529147";
const STORAGE_KEY = "catalogo_consulta";
const PAGE_SIZE = 10;

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
        return () => { document.body.style.overflow = ""; };
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
            `• ${qty} x ${producto.name} ($${formatNumber(producto.price)} c/u)`
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
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div />
                    <div className="text-center">
                        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-wide">
                            Scenta <span className="text-[#7D9878] dark:text-[#A3B69B]">Catálogo</span>
                        </h1>
                        <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Armá tu pedido y consultalo por WhatsApp</p>
                    </div>
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

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-32">
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
                <footer className="mt-16 pt-6 border-t border-[#E6DFD5] dark:border-[#353B33] text-center">
                    <a href="/login" className="text-[11px] text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#7D9878] transition-colors">
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

            {/* Panel del pedido */}
            {drawerOpen && (
                <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Mi pedido">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
                    <aside className="relative w-full max-w-md h-full bg-[#F9F6F0] dark:bg-[#1B1D1A] flex flex-col shadow-2xl">
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
                    </aside>
                </div>
            )}
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

function TarjetaProducto({ producto, qty, onQty }: { producto: CatalogoProducto; qty: number; onQty: (qty: number) => void }) {
    const { title, brand } = extractBrand(producto.name);
    const etiquetas = [producto.category, producto.gender].filter(Boolean).join(" · ");

    return (
        <article className="rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] p-5 flex flex-col gap-3">
            <div className="flex-1 space-y-1.5">
                {etiquetas && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B]">{etiquetas}</p>
                )}
                <h3 className="font-bold leading-snug">{title}</h3>
                {brand && <p className="text-xs font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">{brand}</p>}
                {producto.description && (
                    <p className="text-sm text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 line-clamp-3">{producto.description}</p>
                )}
                {producto.availability === "demora" && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B5735C] dark:text-[#D29680]">
                        <Clock className="w-3.5 h-3.5" />
                        {producto.deliveryDays > 0 ? `Entrega en ${producto.deliveryDays} días` : "Entrega con demora"}
                    </p>
                )}
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E6DFD5] dark:border-[#353B33]">
                <p className="text-lg font-black">${formatNumber(producto.price)}</p>
                {qty > 0 ? (
                    <Stepper qty={qty} onQty={onQty} />
                ) : (
                    <button
                        onClick={() => onQty(1)}
                        className="flex items-center gap-1.5 rounded-full bg-[#7D9878] hover:bg-[#6B8566] text-white px-4 py-2 text-sm font-bold transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Agregar
                    </button>
                )}
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
