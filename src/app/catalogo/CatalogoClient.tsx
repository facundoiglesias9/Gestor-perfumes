"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Search, Plus, Minus, ShoppingBag, X, MessageCircle, Clock, Trash2, Check, ChevronLeft, ChevronRight, ChevronDown, ArrowUpDown, LayoutGrid, Car, Wind, SprayCan, Sparkles, Users, Ruler, Flame, Flower2, Droplet } from "lucide-react";
import { formatNumber } from "@/lib/format-utils";
import Desplegable from "@/components/Desplegable";
import Buscador from "@/components/Buscador";
import BotonCarrito from "@/components/BotonCarrito";
import { whatsappUrl } from "@/lib/contacto";
import { tipoDe, mlDe, nombreYMarca, slugDe, agruparPorPerfume, type NotasPerfume } from "@/lib/catalogo-perfume";
import Ventana from "@/components/Ventana";

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

const STORAGE_KEY = "catalogo_consulta";
const PAGE_SIZE = 12; // múltiplo de 2 y de 3: las filas quedan completas en celular, tablet y compu

// "Frascos de 50 ML" -> "50 ML", "Frascos Difusores" -> "Difusores": más corto para los botones de filtro.
const etiquetaCategoria = (c: string) => c.replace(/^frascos\s+(de\s+)?/i, "");

// Tipo de producto según su categoría (tipoDe): los frascos de 30/50 ML son perfumes
type Tipo = "todo" | "perfumes" | "difusores" | "auto";
const TIPOS: { id: Tipo; titulo: string; Icono: typeof SprayCan }[] = [
    { id: "todo", titulo: "Todo", Icono: LayoutGrid },
    { id: "perfumes", titulo: "Perfumes", Icono: SprayCan },
    { id: "difusores", titulo: "Difusores", Icono: Wind },
    { id: "auto", titulo: "Auto", Icono: Car },
];
const ORDEN_GENEROS = ["Femenino", "Masculino", "Unisex"];

type Orden = "recomendados" | "precio-asc" | "precio-desc" | "nombre";
const ORDENES: { id: Orden; titulo: string }[] = [
    { id: "recomendados", titulo: "Recomendados" },
    { id: "precio-asc", titulo: "Precio: menor a mayor" },
    { id: "precio-desc", titulo: "Precio: mayor a menor" },
    { id: "nombre", titulo: "Nombre: A a Z" },
];
const PESO_DISPONIBILIDAD: Record<CatalogoProducto["availability"], number> = { disponible: 0, demora: 1, "sin-stock": 2 };

// Filtro de disponibilidad (los sin stock solo aparecen en "Todos")
type FiltroStock = "todos" | "disponible" | "demora";
const STOCKS: { id: FiltroStock; titulo: string }[] = [
    { id: "todos", titulo: "Todos los productos" },
    { id: "disponible", titulo: "En stock" },
    { id: "demora", titulo: "Con demora" },
];

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

// Ficha abierta: qué perfume y qué tamaño se tocó
type Abierto = { slug: string; id?: string };
const RUTA_CATALOGO = "/catalogo";
const rutaPerfume = (slug: string) => `/catalogo/p/${slug}`;

export default function CatalogoClient({ productos, masPedidos = [], notas = {}, perfumeInicial }: {
    /** Notas olfativas por perfume (slug) */
    notas?: Record<string, NotasPerfume>;
    productos: CatalogoProducto[] | null;
    /** Códigos de los más vendidos de los últimos 3 meses, de más a menos */
    masPedidos?: string[];
    /** Si se entró por el link de un perfume, su ficha arranca abierta */
    perfumeInicial?: string;
}) {
    const [search, setSearch] = useState("");
    // Primero el tipo de producto; género y tamaño solo existen para los perfumes
    const [tipo, setTipo] = useState<Tipo>("todo");
    const [genero, setGenero] = useState("Todos");
    const [tamano, setTamano] = useState("Todos");
    const [stock, setStock] = useState<FiltroStock>("todos");
    const [orden, setOrden] = useState<Orden>("recomendados");
    const [page, setPage] = useState(1);
    const gridRef = useRef<HTMLDivElement>(null);
    const [consulta, setConsulta] = useState<Consulta>({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [abierto, setAbierto] = useState<Abierto | null>(perfumeInicial ? { slug: perfumeInicial } : null);

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

    const lista = productos ?? [];
    const byId = useMemo(() => new Map(lista.map(p => [p.id, p])), [lista]);
    const grupos = useMemo(() => agruparPorPerfume(lista), [lista]);

    // Ficha del perfume: al abrirla la dirección pasa a /catalogo/p/<perfume> (así se puede copiar
    // y compartir) sin salir del catálogo; al cerrarla vuelve a /catalogo y todo queda como estaba.
    const abrirFicha = (p: CatalogoProducto) => {
        const slug = slugDe(p);
        setAbierto({ slug, id: p.id });
        if (window.location.pathname !== rutaPerfume(slug)) window.history.pushState(null, "", rutaPerfume(slug));
    };
    const cerrarFicha = () => {
        setAbierto(null);
        if (window.location.pathname !== RUTA_CATALOGO) window.history.pushState(null, "", RUTA_CATALOGO);
    };
    // Atrás / adelante del navegador abren o cierran la ficha según la dirección
    useEffect(() => {
        const alVolver = () => {
            const m = window.location.pathname.match(/^\/catalogo\/p\/([^/]+)/);
            setAbierto(m ? { slug: decodeURIComponent(m[1]) } : null);
        };
        window.addEventListener("popstate", alVolver);
        return () => window.removeEventListener("popstate", alVolver);
    }, []);

    const tamanosAbiertos = abierto ? grupos.get(abierto.slug) ?? null : null;

    // Panel del pedido: bloquea el scroll de atrás y se cierra con Escape (la ficha lo hace sola)
    useEffect(() => {
        if (!drawerOpen) return;
        document.body.style.overflow = "hidden";
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
        document.addEventListener("keydown", alTeclear);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", alTeclear);
        };
    }, [drawerOpen]);

    // Los más pedidos: un producto por perfume, solo los que se pueden pedir
    const destacados = useMemo(() => {
        const vistos = new Set<string>();
        const out: CatalogoProducto[] = [];
        for (const id of masPedidos) {
            const p = byId.get(id);
            if (!p || p.availability === "sin-stock") continue;
            const s = slugDe(p);
            if (vistos.has(s)) continue;
            vistos.add(s);
            out.push(p);
            if (out.length === 8) break;
        }
        return out;
    }, [masPedidos, byId]);

    const q = search.trim().toLowerCase();
    const coincideBusqueda = (p: CatalogoProducto) =>
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const esPerfumes = tipo === "perfumes";
    const pasaGenero = (p: CatalogoProducto) => !esPerfumes || genero === "Todos" || p.gender === genero;
    const pasaTamano = (p: CatalogoProducto) => !esPerfumes || tamano === "Todos" || p.category === tamano;
    const pasaStock = (p: CatalogoProducto) => stock === "todos" || p.availability === stock;
    const pasaTipo = (p: CatalogoProducto) => tipo === "todo" || tipoDe(p) === tipo;

    // Opciones de los perfumes: géneros (sin "Ambiente") y tamaños (30 ml, 50 ml…)
    const perfumes = useMemo(() => lista.filter(p => tipoDe(p) === "perfumes"), [lista]);
    const generos = useMemo(() => {
        const set = new Set(perfumes.map(p => p.gender).filter(g => g && g.toLowerCase() !== "ambiente"));
        return Array.from(set).sort((a, b) => ORDEN_GENEROS.indexOf(a) - ORDEN_GENEROS.indexOf(b) || a.localeCompare(b, "es"));
    }, [perfumes]);
    const tamanos = useMemo(() => {
        const set = new Set(perfumes.map(p => p.category).filter(Boolean));
        return Array.from(set).sort((a, b) => etiquetaCategoria(a).localeCompare(etiquetaCategoria(b), "es", { numeric: true }));
    }, [perfumes]);

    const filtered = useMemo(() => {
        const r = lista.filter(p =>
            pasaTipo(p) && pasaGenero(p) && pasaTamano(p) && pasaStock(p) && coincideBusqueda(p)
        );
        if (orden === "precio-asc") return [...r].sort((a, b) => a.price - b.price);
        if (orden === "precio-desc") return [...r].sort((a, b) => b.price - a.price);
        if (orden === "nombre") return [...r].sort((a, b) => a.name.localeCompare(b.name, "es"));
        // Recomendados: primero lo que se puede pedir ya, al final lo que no tiene stock
        return [...r].sort((a, b) => PESO_DISPONIBILIDAD[a.availability] - PESO_DISPONIBILIDAD[b.availability]);
    }, [lista, q, tipo, genero, tamano, stock, orden]);

    // Cantidad que quedaría al tocar cada opción (respetando la búsqueda y los otros filtros)
    const cuentaTipo = useMemo(() => {
        const c: Record<Tipo, number> = { todo: 0, perfumes: 0, difusores: 0, auto: 0 };
        for (const p of lista) {
            if (!coincideBusqueda(p) || !pasaStock(p)) continue;
            c.todo++;
            c[tipoDe(p)]++;
        }
        return c;
    }, [lista, q, stock]);

    const cuentaGenero = useMemo(() => {
        const base = perfumes.filter(p => pasaTamano(p) && pasaStock(p) && coincideBusqueda(p));
        const c: Record<string, number> = { Todos: base.length };
        for (const p of base) c[p.gender] = (c[p.gender] ?? 0) + 1;
        return c;
    }, [perfumes, q, tamano, tipo, stock]);

    const cuentaTamano = useMemo(() => {
        const base = perfumes.filter(p => pasaGenero(p) && pasaStock(p) && coincideBusqueda(p));
        const c: Record<string, number> = { Todos: base.length };
        for (const p of base) c[p.category] = (c[p.category] ?? 0) + 1;
        return c;
    }, [perfumes, q, genero, tipo, stock]);

    const cuentaStock = useMemo(() => {
        const base = lista.filter(p => pasaTipo(p) && pasaGenero(p) && pasaTamano(p) && coincideBusqueda(p));
        const c: Record<FiltroStock, number> = { todos: base.length, disponible: 0, demora: 0 };
        for (const p of base) if (p.availability !== "sin-stock") c[p.availability]++;
        return c;
    }, [lista, q, tipo, genero, tamano]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const hayFiltros = tipo !== "todo" || q !== "" || orden !== "recomendados" || stock !== "todos";

    useEffect(() => { setPage(1); }, [search, tipo, genero, tamano, stock, orden]);

    const elegirTipo = (t: Tipo) => {
        setTipo(t);
        setGenero("Todos");
        setTamano("Todos");
    };

    const irAPagina = (n: number) => {
        setPage(Math.min(Math.max(1, n), totalPages));
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const limpiarFiltros = () => {
        setSearch("");
        setStock("todos");
        elegirTipo("todo");
        setOrden("recomendados");
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
                            <span key={totalUnidades} className="anim-pop min-w-5 h-5 px-1.5 rounded-full bg-[#C9866F] text-white text-[11px] font-black flex items-center justify-center">
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
                        {/* Filtros: buscar y ordenar, el tipo de producto y (solo en perfumes) género y tamaño */}
                        <section className="mb-6 rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] shadow-sm">
                            <div className="p-4 sm:p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <Buscador
                                        valor={search}
                                        onCambiar={v => setSearch(v)}
                                        placeholder="Buscar perfume, aroma o marca…"
                                        aria-label="Buscar"
                                        fondo="crema"
                                        className="flex-1"
                                    />
                                    <div className="grid grid-cols-2 sm:flex gap-2.5">
                                        <Desplegable
                                            valor={stock}
                                            opciones={STOCKS.map(s => ({ valor: s.id, titulo: s.titulo, extra: String(cuentaStock[s.id]), deshabilitada: s.id !== stock && cuentaStock[s.id] === 0 }))}
                                            onCambiar={setStock}
                                            etiqueta="Disponibilidad"
                                            icono={<span aria-hidden className={`w-2 h-2 rounded-full ${stock === "disponible" ? "bg-[#1baf7a]" : stock === "demora" ? "bg-[#C9A877]" : "bg-[#2C2C2C]/30 dark:bg-[#F4EFEA]/35"}`} />}
                                            resaltado={stock !== "todos"}
                                            className="sm:w-56 shrink-0"
                                        />
                                        <Desplegable
                                            valor={orden}
                                            opciones={ORDENES.map(o => ({ valor: o.id, titulo: o.titulo }))}
                                            onCambiar={setOrden}
                                            etiqueta="Ordenar por"
                                            icono={<ArrowUpDown className="w-4 h-4" />}
                                            resaltado={orden !== "recomendados"}
                                            className="sm:w-56 shrink-0"
                                        />
                                    </div>
                                </div>

                                {/* Tipo de producto: la pastilla se desliza a la opción elegida */}
                                <div role="tablist" aria-label="Tipo de producto" className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                                    {TIPOS.map(({ id, titulo, Icono }) => {
                                        const activo = tipo === id;
                                        const cantidad = cuentaTipo[id];
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                role="tab"
                                                aria-selected={activo}
                                                disabled={!activo && cantidad === 0}
                                                onClick={() => elegirTipo(id)}
                                                className={`relative h-11 rounded-xl text-sm font-semibold transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo
                                                    ? "text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                            >
                                                {activo && (
                                                    <motion.span
                                                        layoutId="catalogo-tipo"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                                        className="absolute inset-0 rounded-xl bg-white dark:bg-[#353B33] shadow-sm ring-1 ring-[#E6DFD5]/80 dark:ring-white/[0.04]"
                                                    />
                                                )}
                                                <span className="relative flex items-center justify-center gap-2">
                                                    <Icono className={`w-4 h-4 ${activo ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />
                                                    {titulo}
                                                    <span className="text-xs font-medium tabular-nums text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{cantidad}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Solo para perfumes: género y tamaño */}
                                <AnimatePresence initial={false}>
                                    {esPerfumes && (
                                        <motion.div
                                            key="filtros-perfumes"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1, transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] } }}
                                            exit={{ height: 0, opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
                                            className="overflow-hidden"
                                        >
                                            <div className="grid grid-cols-2 sm:flex gap-2.5">
                                                <Desplegable
                                                    valor={genero}
                                                    opciones={["Todos", ...generos].map(g => ({
                                                        valor: g,
                                                        titulo: g === "Todos" ? "Todos los géneros" : g,
                                                        extra: String(cuentaGenero[g] ?? 0),
                                                        deshabilitada: g !== genero && !cuentaGenero[g],
                                                    }))}
                                                    onCambiar={setGenero}
                                                    etiqueta="Género"
                                                    icono={<Users className="w-4 h-4" />}
                                                    resaltado={genero !== "Todos"}
                                                    className="sm:w-52"
                                                />
                                                <Desplegable
                                                    valor={tamano}
                                                    opciones={["Todos", ...tamanos].map(t => ({
                                                        valor: t,
                                                        titulo: t === "Todos" ? "Todos los tamaños" : etiquetaCategoria(t).toLowerCase().replace(/\s*ml$/, " ml"),
                                                        extra: String(cuentaTamano[t] ?? 0),
                                                        deshabilitada: t !== tamano && !cuentaTamano[t],
                                                    }))}
                                                    onCambiar={setTamano}
                                                    etiqueta="Tamaño"
                                                    icono={<Ruler className="w-4 h-4" />}
                                                    resaltado={tamano !== "Todos"}
                                                    className="sm:w-52"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#E6DFD5] dark:border-[#353B33] text-sm">
                                <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                    {filtered.length === 0
                                        ? "Sin resultados"
                                        : <>Mostrando <span className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> de <span className="tabular-nums">{filtered.length}</span> productos</>}
                                </p>
                                {hayFiltros && (
                                    <button onClick={limpiarFiltros} className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 h-8 px-2.5 -mr-2.5 rounded-lg text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:bg-[#7D9878]/10 transition-colors duration-150">
                                        <X className="w-3.5 h-3.5" />
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </section>

                        {/* Los más pedidos: solo en la vista inicial, sin filtros, y si hay suficientes ventas */}
                        {!hayFiltros && page === 1 && destacados.length >= 4 && (
                            <section aria-labelledby="mas-pedidos" className="mb-8">
                                <div className="flex items-end justify-between gap-3 mb-3 px-1">
                                    <h2 id="mas-pedidos" className="flex items-center gap-2 font-brand text-lg font-bold">
                                        <Flame className="w-4 h-4 text-[#C9866F]" />
                                        Los más pedidos
                                    </h2>
                                    <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Últimos 3 meses</p>
                                </div>
                                {/* Fila que se desliza de costado; en la compu entran 4 a la vista */}
                                {/* Aire arriba y a los costados (compensado con márgenes negativos): una fila que se desliza
                                    recorta lo que sobresale, y la tarjeta se levanta al pasar el mouse */}
                                <div className="-mx-4 sm:-mx-2 px-4 sm:px-2 -mt-2 pt-2 pb-3 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {destacados.map((p, i) => (
                                        <MiniTarjeta key={p.id} producto={p} puesto={i + 1} onAbrir={() => abrirFicha(p)} className="snap-start shrink-0 w-[46%] sm:w-[31%] lg:w-[calc(25%-9px)]" />
                                    ))}
                                </div>
                            </section>
                        )}

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
                                            onAbrir={() => abrirFicha(p)}
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
                    <nav aria-label="Legales" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                        <a href="/terminos" className="hover:text-[#7D9878] transition-colors">Términos y condiciones</a>
                        <a href="/privacidad" className="hover:text-[#7D9878] transition-colors">Política de privacidad</a>
                    </nav>
                    <a href="/login" className="text-[11px] text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35 hover:text-[#7D9878] transition-colors">
                        Acceso para el equipo
                    </a>
                </footer>
            </main>

            {/* Ficha del perfume: ventana centrada (cierra con Escape o tocando afuera) */}
            <Ventana abierta={!!(abierto && tamanosAbiertos)} onCerrar={cerrarFicha} etiqueta="Ficha del perfume" z={60}>
                {tamanosAbiertos && abierto && (
                    <FichaPerfume tamanos={tamanosAbiertos} idInicial={abierto.id} notas={notas[abierto.slug]} onCerrar={cerrarFicha} />
                )}
            </Ventana>

            {/* Barra inferior con el resumen del pedido */}
            {totalUnidades > 0 && !drawerOpen && (
                <div className="anim-entrada fixed bottom-0 inset-x-0 z-30 p-4">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="max-w-xl mx-auto w-full flex items-center justify-between gap-3 rounded-2xl bg-[#242723] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] px-5 py-4 shadow-2xl"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold">
                            <ShoppingBag className="w-4 h-4" />
                            <span key={totalUnidades} className="anim-pop inline-block">
                                {totalUnidades} {totalUnidades === 1 ? "producto" : "productos"} · ${formatNumber(total)}
                            </span>
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

// Insignia de disponibilidad (en stock / demora / sin stock), la misma en tarjetas y ficha
function InsigniaStock({ producto, className = "" }: { producto: CatalogoProducto; className?: string }) {
    if (producto.availability === "sin-stock") {
        return (
            <span className={`rounded-full bg-[#C9866F] text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}>
                Sin stock
            </span>
        );
    }
    const enStock = producto.availability === "disponible";
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/85 dark:bg-[#1B1D1A]/75 backdrop-blur px-2.5 py-1 text-[10px] font-black ${enStock
            ? "text-[#128a5f] dark:text-[#4fd1a0]"
            : "text-[#7A5C34] dark:text-[#DAC4AA]"} ${className}`}>
            {enStock ? (
                <><span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#1baf7a]" /> En stock</>
            ) : (
                <><Clock className="w-3 h-3" /> {producto.deliveryDays > 0 ? `Demora ${producto.deliveryDays} días` : "Con demora"}</>
            )}
        </span>
    );
}

// Foto del producto o, si no tiene, el degradé con el ícono de su tipo
function ImagenProducto({ producto, tamanoIcono = "w-10 h-10" }: { producto: CatalogoProducto; tamanoIcono?: string }) {
    const { Icono, acento } = estiloProducto(producto);
    return producto.foto ? (
        <img
            src={producto.foto}
            alt={producto.name}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105 ${producto.availability === "sin-stock" ? "opacity-50 grayscale" : ""}`}
        />
    ) : (
        <Icono className={`${tamanoIcono} ${acento} opacity-70 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.4} />
    );
}

// Tarjeta chica para "Los más pedidos" y "Te puede gustar": toda la tarjeta abre la ficha
function MiniTarjeta({ producto, puesto, onAbrir, className = "" }: { producto: CatalogoProducto; puesto?: number; onAbrir: () => void; className?: string }) {
    const { nombre, marca } = nombreYMarca(producto.name);
    const { fondo, formato } = estiloProducto(producto);
    const ml = mlDe(producto);
    return (
        <button
            type="button"
            onClick={onAbrir}
            className={`group text-left flex flex-col overflow-hidden rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] transition-[transform,border-color,box-shadow] duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-[#A3B69B]/60 [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-[#2C2C2C]/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${className}`}
        >
            <div className={`relative h-24 flex items-center justify-center ${producto.foto ? "bg-white" : `bg-gradient-to-br ${fondo}`}`}>
                <ImagenProducto producto={producto} tamanoIcono="w-8 h-8" />
                {puesto && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] text-[11px] font-black flex items-center justify-center tabular-nums">
                        {puesto}
                    </span>
                )}
                <span className="absolute top-2 right-2 rounded-lg bg-white/85 dark:bg-[#1B1D1A]/75 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                    {ml ? `${ml} ml` : formato}
                </span>
            </div>
            <div className="p-3 flex-1 flex flex-col">
                {marca && <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7D9878] dark:text-[#A3B69B] truncate">{marca}</p>}
                <p className="font-brand text-sm font-bold leading-snug line-clamp-2">{nombre}</p>
                <p className="mt-auto pt-1.5 text-sm font-black tabular-nums">${formatNumber(producto.price)}</p>
            </div>
        </button>
    );
}

function TarjetaProducto({ producto, qty, onQty, onAbrir }: { producto: CatalogoProducto; qty: number; onQty: (qty: number) => void; onAbrir: () => void }) {
    // El tamaño o formato ya se muestra en la etiqueta del recuadro: no va en el nombre.
    const { nombre, marca: brand } = nombreYMarca(producto.name);
    const { formato, fondo, acento } = estiloProducto(producto);
    const enPedido = qty > 0;
    const sinStock = producto.availability === "sin-stock";
    // Mientras el carrito del botón viaja, el botón sigue a la vista (después aparece el − / +)
    const [animando, setAnimando] = useState(false);
    // Tamaño del frasco (30 / 50 ml) bien visible: es lo primero que se compara entre dos perfumes
    const ml = formato.match(/(\d+)\s*ml/i)?.[1];

    return (
        // Tocar la tarjeta (menos sus botones) abre la ficha del perfume
        <article
            onClick={e => { if (!(e.target as HTMLElement).closest("button, a")) onAbrir(); }}
            className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white dark:bg-[#242723] cursor-pointer transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2C2C2C]/5 dark:hover:shadow-black/30 ${enPedido
            ? "border-[#7D9878] ring-1 ring-[#7D9878]/40"
            : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#A3B69B]/60"}`}
        >
            {/* Recuadro visual: la foto si hay; si no, degradé con el ícono del tipo */}
            <div className={`relative h-40 overflow-hidden flex items-center justify-center ${producto.foto ? "bg-white" : `bg-gradient-to-br ${fondo}`}`}>
                <ImagenProducto producto={producto} />
                {ml ? (
                    <span className="absolute top-3 left-3 inline-flex items-baseline gap-0.5 rounded-xl bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] px-3 py-1.5 shadow-md shadow-black/15">
                        <span className="text-lg font-black leading-none tabular-nums">{ml}</span>
                        <span className="text-[11px] font-bold leading-none">ml</span>
                    </span>
                ) : (
                    <span className="absolute top-3 left-3 rounded-xl bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] px-3 py-1.5 text-xs font-bold shadow-md shadow-black/15">
                        {formato}
                    </span>
                )}
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
                {/* Disponibilidad: en stock / demora / sin stock */}
                <InsigniaStock producto={producto} className="absolute bottom-3 left-3" />
            </div>

            <div className="flex-1 flex flex-col gap-1 p-5">
                {brand && (
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7D9878] dark:text-[#A3B69B]">{brand}</p>
                )}
                <h3 className="font-brand text-lg font-bold leading-snug">
                    {/* Botón real para quien navega con teclado o lector de pantalla */}
                    <button type="button" onClick={onAbrir} className="text-left hover:text-[#5A7356] dark:hover:text-[#A3B69B] transition-colors duration-150 focus-visible:outline-none focus-visible:underline">
                        {nombre}
                    </button>
                </h3>
                {producto.description && (
                    <p className="text-sm text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 line-clamp-2 mt-1">{producto.description}</p>
                )}

                <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">Precio</p>
                        <p className="text-xl font-black tracking-tight">${formatNumber(producto.price)}</p>
                    </div>
                    {sinStock && !enPedido && !animando ? (
                        <span className="rounded-full border border-[#E6DFD5] dark:border-[#353B33] px-4 py-2.5 text-sm font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">
                            Sin stock
                        </span>
                    ) : enPedido && !animando ? (
                        <Stepper qty={qty} onQty={onQty} />
                    ) : (
                        <BotonCarrito
                            variante="tinta"
                            onAgregar={() => onQty(qty + 1)}
                            onInicio={() => setAnimando(true)}
                            onFin={() => setAnimando(false)}
                            aria-label={`Agregar ${producto.name} al pedido`}
                        />
                    )}
                </div>
            </div>
        </article>
    );
}

// Vidrio, el mismo lenguaje que la barra del sistema: relleno translúcido en degradé, desenfoque
// del fondo y un brillo fino en el borde de arriba
const VIDRIO_PANEL = [
    "bg-gradient-to-b from-white/85 to-white/65 dark:from-[#2E322D]/80 dark:to-[#1F221E]/75",
    "backdrop-blur-2xl backdrop-saturate-150",
    "border border-white/80 dark:border-white/[0.12]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_80px_-20px_rgba(44,44,44,0.45)]",
    "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_30px_80px_-20px_rgba(0,0,0,0.8)]",
].join(" ");
const VIDRIO_PIEZA = "bg-white/60 dark:bg-white/[0.05] border border-white/80 dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

// Las secciones entran una detrás de otra, apenas (se abre de vez en cuando: puede tener un detalle)
const ENTRADA = {
    oculto: { opacity: 0, y: 6 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.06 + i * 0.045, duration: 0.28, ease: [0.23, 1, 0.32, 1] as const } }),
};

// Cada nivel con un ícono que lo cuenta: la salida se evapora (aire), el corazón es floral,
// el fondo queda en la piel (gota)
const NIVELES_NOTAS = [
    { nivel: "Salida", ayuda: "Lo primero que se siente", Icono: Wind, campo: "salida" },
    { nivel: "Corazón", ayuda: "El centro del perfume", Icono: Flower2, campo: "corazon" },
    { nivel: "Fondo", ayuda: "Lo que queda en la piel", Icono: Droplet, campo: "fondo" },
] as const;

// Ficha del perfume: ventana centrada de vidrio con lo que no entra en la tarjeta:
// la descripción y las notas. Abajo, consultar por WhatsApp.
function FichaPerfume({ tamanos, idInicial, notas, onCerrar }: {
    tamanos: CatalogoProducto[];
    idInicial?: string;
    /** Notas olfativas del perfume, si están cargadas */
    notas?: NotasPerfume;
    onCerrar: () => void;
}) {
    const elegido = tamanos.find(t => t.id === idInicial) ?? tamanos.find(t => t.availability !== "sin-stock") ?? tamanos[0];
    const { nombre, marca } = nombreYMarca(elegido.name);
    const { acento, formato, Icono } = estiloProducto(elegido);
    const esPerfume = tipoDe(elegido) === "perfumes";
    // La descripción que cargaste en el producto tiene prioridad; si no hay, la de las notas
    const descripcion = tamanos.map(t => t.description).find(Boolean) || notas?.descripcion || "";
    const hayNotas = !!(notas && (notas.salida || notas.corazon || notas.fondo));
    const detalle = `${nombre}${marca ? ` (${marca})` : ""}${esPerfume ? ` - ${elegido.gender}` : ""}`;
    const g = (elegido.gender || "").toLowerCase();
    // Resplandor de color detrás del encabezado, según el género (como el degradé de las tarjetas)
    const resplandor = g.startsWith("fem") ? "bg-[#C9866F]" : g.startsWith("masc") ? "bg-[#7D9878]" : "bg-[#C9A877]";

    const titulo = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40";

    return (
        <div className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] ${VIDRIO_PANEL}`}>
            {/* Luces de color difusas detrás del vidrio */}
            <span aria-hidden className={`pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full ${resplandor} opacity-30 dark:opacity-25 blur-[70px]`} />
            <span aria-hidden className="pointer-events-none absolute -top-20 right-0 w-56 h-56 rounded-full bg-[#DAC4AA] opacity-25 dark:opacity-10 blur-[70px]" />

            <div className="relative">
                {/* Encabezado */}
                <div className="flex items-center gap-4 p-6 pr-16">
                    <div className={`w-20 h-20 shrink-0 rounded-[1.4rem] overflow-hidden flex items-center justify-center ${elegido.foto ? "bg-white" : VIDRIO_PIEZA}`}>
                        {elegido.foto ? <ImagenProducto producto={elegido} /> : <Icono className={`w-9 h-9 ${acento}`} strokeWidth={1.4} />}
                    </div>
                    <div className="min-w-0">
                        {marca && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5A7356] dark:text-[#A3B69B]">{marca}</p>}
                        <h2 className="font-brand text-[1.65rem] font-bold leading-tight">{nombre}</h2>
                        <p className={`mt-1 text-[11px] font-bold uppercase tracking-widest ${acento}`}>{esPerfume ? elegido.gender : formato}</p>
                        {/* Familia olfativa (floral, amaderado…) */}
                        {notas && notas.familia.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {notas.familia.map(f => (
                                    <span key={f} className={`h-6 px-2.5 rounded-full inline-flex items-center text-[11px] font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 ${VIDRIO_PIEZA}`}>
                                        {f}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Cerrar: al pasar el mouse se tiñe de terracota y la X gira un cuarto de vuelta */}
                    <button
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className={`group/cerrar absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center ${VIDRIO_PIEZA} text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 [@media(hover:hover)]:hover:bg-[#C9866F] [@media(hover:hover)]:hover:border-[#C9866F] [@media(hover:hover)]:hover:text-white [@media(hover:hover)]:hover:shadow-[0_6px_18px_-4px_rgba(201,134,111,0.6)] active:scale-[0.92] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9866F]/60`}
                    >
                        <X className="w-4 h-4 transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover/cerrar:rotate-90" />
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-6">
                    {/* Tamaños y precios: una placa de vidrio dividida en columnas, una por tamaño,
                        con el tamaño arriba, el precio grande y la disponibilidad escrita abajo */}
                    <motion.div
                        custom={0}
                        variants={ENTRADA}
                        initial="oculto"
                        animate="visible"
                        className={`grid rounded-2xl overflow-hidden divide-x divide-[#2C2C2C]/[0.07] dark:divide-white/[0.07] ${VIDRIO_PIEZA}`}
                        style={{ gridTemplateColumns: `repeat(${tamanos.length}, minmax(0, 1fr))` }}
                    >
                        {tamanos.map(t => {
                            const ml = mlDe(t);
                            const estado = t.availability === "disponible"
                                ? { texto: "En stock", color: "text-[#128a5f] dark:text-[#4fd1a0]", punto: "bg-[#1baf7a]" }
                                : t.availability === "demora"
                                    ? { texto: t.deliveryDays > 0 ? `Demora ${t.deliveryDays} días` : "Con demora", color: "text-[#8A6A3E] dark:text-[#DAC4AA]", punto: "bg-[#C9A877]" }
                                    : { texto: "Sin stock", color: "text-[#97604D] dark:text-[#DBA793]", punto: "bg-[#C9866F]" };
                            return (
                                <div key={t.id} className={`px-4 py-3.5 ${t.availability === "sin-stock" ? "opacity-60" : ""}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                        {ml ? `Frasco ${ml} ml` : etiquetaCategoria(t.category)}
                                    </p>
                                    <p className="mt-1 flex items-baseline gap-0.5 font-black tracking-tight tabular-nums">
                                        <span className="text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/55">$</span>
                                        <span className="text-[1.6rem] leading-none">{formatNumber(t.price)}</span>
                                    </p>
                                    <p className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold ${estado.color}`}>
                                        <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${estado.punto}`} />
                                        {estado.texto}
                                    </p>
                                </div>
                            );
                        })}
                    </motion.div>

                    <motion.section custom={1} variants={ENTRADA} initial="oculto" animate="visible">
                        <p className={titulo}>Descripción</p>
                        {descripcion ? (
                            <p className="mt-2 text-[15px] leading-relaxed text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">{descripcion}</p>
                        ) : (
                            <p className="mt-2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">Todavía no cargamos la descripción de este perfume.</p>
                        )}
                    </motion.section>

                    {/* Notas: salida, corazón y fondo, cada una con su ícono */}
                    <motion.section custom={2} variants={ENTRADA} initial="oculto" animate="visible">
                        <p className={titulo}>Notas</p>
                        {hayNotas ? (
                            <ol className="mt-3 space-y-2">
                                {NIVELES_NOTAS.filter(n => notas?.[n.campo]).map(n => (
                                    <li key={n.nivel} title={n.ayuda} className={`flex items-center gap-3 rounded-2xl pl-2 pr-3 py-2 ${VIDRIO_PIEZA}`}>
                                        <span aria-hidden className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-[#7D9878]/12 dark:bg-[#A3B69B]/10 text-[#5A7356] dark:text-[#A3B69B]">
                                            <n.Icono className="w-4 h-4" strokeWidth={1.75} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{n.nivel}</span>
                                            <span className="block text-sm font-medium leading-snug">{notas?.[n.campo]}</span>
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">Todavía no cargamos las notas de este perfume. Consultanos por WhatsApp.</p>
                        )}
                    </motion.section>

                    {/* Consultar: como la pastilla del menú (oscura; clara en modo oscuro) */}
                    <motion.div custom={3} variants={ENTRADA} initial="oculto" animate="visible" className="pt-1">
                        <a
                            href={whatsappUrl(`¡Hola Scenta! Quería consultar por ${detalle}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] text-sm font-bold shadow-lg shadow-black/15 dark:shadow-black/40 [@media(hover:hover)]:hover:brightness-110 active:scale-[0.97] transition-[filter,transform] duration-150"
                        >
                            <MessageCircle className="w-4 h-4 text-[#A3B69B] dark:text-[#5A7356]" />
                            Consultar por WhatsApp
                        </a>
                    </motion.div>
                </div>
            </div>
        </div>
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
