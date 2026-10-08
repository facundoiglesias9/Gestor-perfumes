"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
    Store, ExternalLink, Plus, Search, X, ImagePlus, Loader2, Pencil, Eye, EyeOff, Clock, PackageX, PackageCheck,
    ImageOff, Tags,
} from "lucide-react";
import { toast } from "sonner";
import { useAppContext, type Producto, type AvailabilityStatus } from "@/context/AppContext";
import { actualizarPublicaciones, guardarFotoProducto, quitarFotoProducto, type CambiosPublicacion } from "@/lib/catalogo-actions";
import { prepararFoto } from "@/lib/foto-cliente";
import { extractBrand } from "@/lib/product-utils";
import PaginationControls from "@/components/PaginationControls";
import ConfirmModal from "@/components/ConfirmModal";

const POR_PAGINA = 20;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Filtro = "todos" | "catalogo" | "ocultos" | "sin-stock" | "sin-precio" | "sin-foto";

const tienePrecio = (p: Producto) => Number(p.priceMinorista) > 0;
// Lo que ve un cliente: visible y con precio minorista (los "sin stock" se ven, marcados así)
const enCatalogo = (p: Producto) => p.visibleCatalogo !== false && tienePrecio(p);
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

const FILTROS: { key: Filtro; label: string; cumple: (p: Producto) => boolean }[] = [
    { key: "todos", label: "Todos", cumple: () => true },
    { key: "catalogo", label: "En el catálogo", cumple: enCatalogo },
    { key: "ocultos", label: "Ocultos", cumple: p => p.visibleCatalogo === false },
    { key: "sin-stock", label: "Sin stock", cumple: p => p.availabilityStatus === "no-disponible" },
    { key: "sin-precio", label: "Sin precio", cumple: p => !tienePrecio(p) },
    { key: "sin-foto", label: "Sin foto", cumple: p => enCatalogo(p) && !p.imageUrl },
];

const DISPONIBILIDAD: { key: AvailabilityStatus; label: string; punto: string; activo: string }[] = [
    { key: "disponible", label: "Hay", punto: "bg-[#1baf7a]", activo: "bg-white dark:bg-[#2B3A33] text-[#128a5f] dark:text-[#4fd1a0]" },
    { key: "demora", label: "Demora", punto: "bg-[#DAC4AA]", activo: "bg-white dark:bg-[#3A352C] text-[#7A5C34] dark:text-[#DAC4AA]" },
    { key: "no-disponible", label: "Sin stock", punto: "bg-[#eb6834]", activo: "bg-white dark:bg-[#3A2F2A] text-[#c4501f] dark:text-[#f2895c]" },
];

// Interruptor de encendido/apagado (el círculo se desliza)
function Interruptor({ encendido, onCambiar, etiqueta }: { encendido: boolean; onCambiar: () => void; etiqueta: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={encendido}
            aria-label={etiqueta}
            title={etiqueta}
            onClick={onCambiar}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${encendido ? "bg-[#1baf7a] dark:bg-[#199e70]" : "bg-[#D3CBBF] dark:bg-[#474C44]"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${encendido ? "translate-x-5" : "translate-x-0"}`}
            />
        </button>
    );
}

export default function MiCatalogoPage() {
    const { productos, setProductosSinGuardar, categorias, isLoading, addSystemLog } = useAppContext();
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [categoria, setCategoria] = useState("Todas");
    const [pagina, setPagina] = useState(1);
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [subiendo, setSubiendo] = useState<string | null>(null);
    const [arrastrando, setArrastrando] = useState<string | null>(null);
    const [quitarFotoDe, setQuitarFotoDe] = useState<Producto | null>(null);
    const inputFoto = useRef<HTMLInputElement>(null);
    const fotoPara = useRef<string | null>(null);

    const ordenados = useMemo(
        () => [...productos].sort((a, b) => a.name.localeCompare(b.name, "es")),
        [productos],
    );

    // Búsqueda y categoría primero; los contadores de los filtros salen de ahí
    const base = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return ordenados.filter(p =>
            (categoria === "Todas" || p.category === categoria) &&
            (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)),
        );
    }, [ordenados, busqueda, categoria]);

    const conteos = useMemo(
        () => Object.fromEntries(FILTROS.map(f => [f.key, base.filter(f.cumple).length])) as Record<Filtro, number>,
        [base],
    );
    const visibles = useMemo(() => base.filter(FILTROS.find(f => f.key === filtro)!.cumple), [base, filtro]);
    const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const deLaPagina = visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    const totalCatalogo = productos.filter(enCatalogo).length;
    const conFoto = productos.filter(p => enCatalogo(p) && p.imageUrl).length;

    const irA = (cambio: () => void) => { cambio(); setPagina(1); };

    // Cambios: se ven al instante y se guardan en el servidor; si falla, se vuelve atrás
    const aplicar = async (ids: string[], cambios: CambiosPublicacion, aviso?: string) => {
        const idsSet = new Set(ids);
        const antes = new Map(productos.filter(p => idsSet.has(p.id)).map(p => [p.id, p]));
        setProductosSinGuardar(prev => prev.map(p => !idsSet.has(p.id) ? p : {
            ...p,
            ...(cambios.visible !== undefined && { visibleCatalogo: cambios.visible }),
            ...(cambios.disponibilidad && { availabilityStatus: cambios.disponibilidad }),
            ...(cambios.dias !== undefined && { deliveryDays: cambios.dias }),
        }));
        const r = await actualizarPublicaciones(ids, cambios).catch(() => ({ ok: false as const, error: "Revisá la conexión." }));
        if (!r.ok) {
            setProductosSinGuardar(prev => prev.map(p => antes.get(p.id) ?? p));
            toast.error("No se pudo guardar el cambio", { description: r.error });
            return false;
        }
        if (aviso) toast.success(aviso);
        return true;
    };

    const subirFoto = async (id: string, archivo: File) => {
        setSubiendo(id);
        try {
            const { base64, tipo } = await prepararFoto(archivo);
            const r = await guardarFotoProducto(id, base64, tipo);
            if (!r.ok) throw new Error(r.error);
            setProductosSinGuardar(prev => prev.map(p => p.id === id ? { ...p, imageUrl: r.dato } : p));
            const nombre = productos.find(p => p.id === id)?.name ?? id;
            addSystemLog("info", `Foto cargada: ${nombre}`);
            toast.success("Foto guardada", { description: "Ya se ve en el catálogo." });
        } catch (err: any) {
            toast.error("No se pudo subir la foto", { description: err?.message });
        } finally {
            setSubiendo(null);
        }
    };

    const elegirFoto = (id: string) => {
        fotoPara.current = id;
        inputFoto.current?.click();
    };

    const quitarFoto = async () => {
        const p = quitarFotoDe;
        setQuitarFotoDe(null);
        if (!p) return;
        const r = await quitarFotoProducto(p.id).catch(() => ({ ok: false as const, error: "Revisá la conexión." }));
        if (!r.ok) return toast.error("No se pudo quitar la foto", { description: r.error });
        setProductosSinGuardar(prev => prev.map(x => x.id === p.id ? { ...x, imageUrl: undefined } : x));
        toast.success("Foto quitada");
    };

    const soltarFoto = (e: DragEvent, id: string) => {
        e.preventDefault();
        setArrastrando(null);
        const archivo = e.dataTransfer.files?.[0];
        if (archivo) subirFoto(id, archivo);
    };

    const alternarSeleccion = (id: string) => setSeleccion(prev => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id); else s.add(id);
        return s;
    });
    const todaLaPaginaElegida = deLaPagina.length > 0 && deLaPagina.every(p => seleccion.has(p.id));
    const alternarPagina = () => setSeleccion(prev => {
        const s = new Set(prev);
        deLaPagina.forEach(p => todaLaPaginaElegida ? s.delete(p.id) : s.add(p.id));
        return s;
    });

    const aplicarASeleccion = async (cambios: CambiosPublicacion, aviso: string) => {
        const ids = [...seleccion];
        if (await aplicar(ids, cambios, `${aviso} (${ids.length})`)) setSeleccion(new Set());
    };

    return (
        <div className="space-y-6 pb-12">
            <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (archivo && fotoPara.current) subirFoto(fotoPara.current, archivo);
                }}
            />

            {/* Encabezado */}
            <header className="anim-entrada flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 bg-white dark:bg-[#242723] p-6 md:p-8 rounded-[2rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div className="space-y-2 max-w-2xl">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                        <Store className="w-3.5 h-3.5" />
                        Vidriera
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Catálogo</h1>
                    <p className="text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">
                        {totalCatalogo} en el catálogo · {productos.length} productos en total
                    </p>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 leading-relaxed">
                        Lo que ven los clientes en el catálogo. <strong className="font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">Visible</strong> apagado
                        lo saca del catálogo sin borrarlo. <strong className="font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">Sin stock</strong> lo
                        muestra marcado así y no se puede pedir. Tocá la foto (o arrastrá una encima) para cargarla o cambiarla.
                    </p>
                </div>

                <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
                    <div className="flex gap-2">
                        <a
                            href="/catalogo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.97] transition-[background-color,color,transform] duration-150"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Ver catálogo
                        </a>
                        <Link
                            href="/crear-producto"
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo producto
                        </Link>
                    </div>
                    {/* Avance de fotos */}
                    <div className="w-full sm:w-72">
                        <div className="flex justify-between text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 mb-1.5">
                            <span>Productos del catálogo con foto</span>
                            <span className="font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">{conFoto} de {totalCatalogo}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#7D9878]/15 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-[#7D9878] dark:bg-[#A3B69B]"
                                initial={false}
                                animate={{ width: `${totalCatalogo ? Math.round((conFoto / totalCatalogo) * 100) : 0}%` }}
                                transition={{ duration: 0.6, ease: EASE_OUT }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Filtros y buscador */}
            <div className="anim-entrada [animation-delay:60ms] flex flex-col xl:flex-row xl:items-center gap-3">
                <div role="group" aria-label="Filtrar" className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 xl:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {FILTROS.map(f => {
                        const activo = filtro === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => irA(() => setFiltro(f.key))}
                                aria-pressed={activo}
                                className={`shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-[13px] font-semibold border transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] ${activo
                                    ? "bg-[#2C2C2C] dark:bg-[#F4EFEA] border-transparent text-white dark:text-[#1B1D1A]"
                                    : "bg-white dark:bg-[#242723] border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                            >
                                {f.label}
                                <span className={`min-w-5 h-5 px-1.5 rounded-md text-[11px] font-bold tabular-nums flex items-center justify-center ${activo ? "bg-white/20 dark:bg-[#1B1D1A]/15" : "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}>
                                    {conteos[f.key]}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-3 xl:ml-auto">
                    <label className="relative flex items-center h-10 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] focus-within:ring-2 focus-within:ring-[#7D9878]/25">
                        <span className="sr-only">Categoría</span>
                        <Tags className="absolute left-3 w-4 h-4 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none" />
                        <select
                            value={categoria}
                            onChange={(e) => irA(() => setCategoria(e.target.value))}
                            className="appearance-none h-full bg-transparent pl-9 pr-4 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none cursor-pointer dark:[&_option]:bg-[#242723]"
                        >
                            <option value="Todas">Todas las categorías</option>
                            {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </label>
                    <div className="relative flex-1 xl:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none" />
                        <input
                            type="search"
                            aria-label="Buscar producto"
                            placeholder="Buscar producto…"
                            value={busqueda}
                            onChange={(e) => irA(() => setBusqueda(e.target.value))}
                            className="w-full h-10 pl-10 pr-9 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-sm text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/45 dark:placeholder:text-[#F4EFEA]/40 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 [&::-webkit-search-cancel-button]:hidden"
                        />
                        {busqueda && (
                            <button onClick={() => irA(() => setBusqueda(""))} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A]">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Acciones para varios a la vez */}
            <AnimatePresence initial={false}>
                {seleccion.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
                        exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
                        className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A]"
                    >
                        <span className="text-sm font-semibold mr-2">{seleccion.size} {seleccion.size === 1 ? "elegido" : "elegidos"}</span>
                        {[
                            { label: "Mostrar", icono: Eye, cambios: { visible: true }, aviso: "Ahora se ven en el catálogo" },
                            { label: "Ocultar", icono: EyeOff, cambios: { visible: false }, aviso: "Ocultos del catálogo" },
                            { label: "Hay stock", icono: PackageCheck, cambios: { disponibilidad: "disponible" as const }, aviso: "Marcados con stock" },
                            { label: "Demora", icono: Clock, cambios: { disponibilidad: "demora" as const }, aviso: "Marcados con demora" },
                            { label: "Sin stock", icono: PackageX, cambios: { disponibilidad: "no-disponible" as const }, aviso: "Marcados sin stock" },
                        ].map(a => (
                            <button
                                key={a.label}
                                onClick={() => aplicarASeleccion(a.cambios, a.aviso)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white/10 dark:bg-[#1B1D1A]/10 hover:bg-white/20 dark:hover:bg-[#1B1D1A]/20 active:scale-[0.96] transition-[background-color,transform] duration-150"
                            >
                                <a.icono className="w-3.5 h-3.5" />
                                {a.label}
                            </button>
                        ))}
                        <button onClick={() => setSeleccion(new Set())} className="ml-auto text-xs font-semibold opacity-70 hover:opacity-100">
                            Quitar selección
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lista */}
            <section className="anim-entrada [animation-delay:120ms] bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm overflow-hidden">
                {isLoading ? (
                    <p className="py-16 text-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Cargando productos…</p>
                ) : visibles.length === 0 ? (
                    <div className="py-16 px-6 text-center">
                        <p className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">No hay productos para mostrar</p>
                        <p className="text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 mt-1">Probá con otro filtro o búsqueda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[880px]">
                            <thead>
                                <tr className="text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 bg-[#F9F6F0]/70 dark:bg-[#1B1D1A]/60 border-b border-[#E6DFD5] dark:border-[#353B33]">
                                    <th className="w-12 py-3 pl-5">
                                        <input
                                            type="checkbox"
                                            checked={todaLaPaginaElegida}
                                            onChange={alternarPagina}
                                            aria-label="Elegir todos los de esta página"
                                            className="w-4 h-4 accent-[#7D9878] cursor-pointer"
                                        />
                                    </th>
                                    <th className="py-3 px-3 text-left font-semibold">Producto</th>
                                    <th className="py-3 px-3 text-left font-semibold">Precio</th>
                                    <th className="py-3 px-3 text-left font-semibold">Disponibilidad</th>
                                    <th className="py-3 px-3 text-center font-semibold">Visible</th>
                                    <th className="py-3 pl-3 pr-5 text-right font-semibold"><span className="sr-only">Editar</span></th>
                                </tr>
                            </thead>
                            <tbody key={`${filtro}-${paginaActual}`} className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                {deLaPagina.map((p, i) => {
                                    const { title, brand } = extractBrand(p.name);
                                    const visible = p.visibleCatalogo !== false;
                                    const estado = p.availabilityStatus || "disponible";
                                    const elegido = seleccion.has(p.id);
                                    const cargando = subiendo === p.id;
                                    return (
                                        <tr
                                            key={p.id}
                                            style={{ animationDelay: `${i * 18}ms` }}
                                            className={`anim-fila transition-colors duration-150 ${elegido ? "bg-[#7D9878]/[0.07]" : "hover:bg-[#F9F6F0] dark:hover:bg-[#2A2E29]"}`}
                                        >
                                            <td className="py-3 pl-5 align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={elegido}
                                                    onChange={() => alternarSeleccion(p.id)}
                                                    aria-label={`Elegir ${p.name}`}
                                                    className="w-4 h-4 accent-[#7D9878] cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-3 min-w-[280px]">
                                                    {/* Foto: tocar para cargar, o arrastrar una encima */}
                                                    <button
                                                        type="button"
                                                        onClick={() => elegirFoto(p.id)}
                                                        onDragOver={(e) => { e.preventDefault(); setArrastrando(p.id); }}
                                                        onDragLeave={() => setArrastrando(null)}
                                                        onDrop={(e) => soltarFoto(e, p.id)}
                                                        disabled={cargando}
                                                        title={p.imageUrl ? "Cambiar foto" : "Agregar foto"}
                                                        className={`relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border flex items-center justify-center transition-[border-color,transform,box-shadow] duration-150 active:scale-[0.96] ${arrastrando === p.id
                                                            ? "border-[#7D9878] ring-2 ring-[#7D9878]/40 scale-105"
                                                            : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/60"} ${p.imageUrl ? "bg-white" : "bg-[#F4EFEA] dark:bg-[#1B1D1A]"}`}
                                                    >
                                                        {p.imageUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <ImagePlus className="w-5 h-5 text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35" />
                                                        )}
                                                        {cargando && (
                                                            <span className="absolute inset-0 bg-white/80 dark:bg-[#1B1D1A]/80 flex items-center justify-center">
                                                                <Loader2 className="w-5 h-5 animate-spin text-[#7D9878]" />
                                                            </span>
                                                        )}
                                                    </button>
                                                    <div className="min-w-0">
                                                        {brand && <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B8566] dark:text-[#A3B69B] truncate">{brand}</p>}
                                                        <p className={`text-sm font-semibold truncate max-w-[320px] ${visible ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45"}`} title={p.name}>{title}</p>
                                                        <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 truncate">
                                                            {[p.category, p.gender].filter(Boolean).join(" · ")}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5 text-xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => elegirFoto(p.id)}
                                                                disabled={cargando}
                                                                className="inline-flex items-center gap-1 font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline disabled:opacity-50"
                                                            >
                                                                <ImagePlus className="w-3.5 h-3.5" />
                                                                {cargando ? "Subiendo…" : p.imageUrl ? "Cambiar foto" : "Agregar foto"}
                                                            </button>
                                                            {p.imageUrl && !cargando && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuitarFotoDe(p)}
                                                                    className="inline-flex items-center gap-1 text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 hover:text-[#c4501f] dark:hover:text-[#f2895c]"
                                                                >
                                                                    <ImageOff className="w-3.5 h-3.5" /> Quitar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                {tienePrecio(p) ? (
                                                    <>
                                                        <p className="text-[15px] font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(p.priceMinorista)}</p>
                                                        {Number(p.price) > 0 && (
                                                            <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 tabular-nums">Mayorista {pesos(p.price)}</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40" title="Sin precio minorista no aparece en el catálogo">Sin precio</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div role="radiogroup" aria-label={`Disponibilidad de ${p.name}`} className="inline-flex p-0.5 rounded-lg bg-[#F4EFEA] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33]">
                                                        {DISPONIBILIDAD.map(d => {
                                                            const activo = estado === d.key;
                                                            return (
                                                                <button
                                                                    key={d.key}
                                                                    type="button"
                                                                    role="radio"
                                                                    aria-checked={activo}
                                                                    onClick={() => !activo && aplicar([p.id], { disponibilidad: d.key })}
                                                                    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ${activo
                                                                        ? `${d.activo} shadow-sm`
                                                                        : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${activo ? d.punto : "bg-current opacity-40"}`} />
                                                                    {d.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {estado === "demora" && (
                                                        <label className="inline-flex items-center gap-1 text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                                            <input
                                                                key={`${p.id}-${p.deliveryDays}`}
                                                                type="number"
                                                                min={0}
                                                                max={365}
                                                                defaultValue={p.deliveryDays || ""}
                                                                placeholder="0"
                                                                aria-label={`Días de demora de ${p.name}`}
                                                                onBlur={(e) => {
                                                                    const dias = Number(e.target.value) || 0;
                                                                    if (dias !== (p.deliveryDays || 0)) aplicar([p.id], { dias });
                                                                }}
                                                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                                                className="w-12 h-7 px-1.5 rounded-md bg-white dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-center font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                                            />
                                                            días
                                                        </label>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <Interruptor
                                                    encendido={visible}
                                                    etiqueta={visible ? `Ocultar ${p.name} del catálogo` : `Mostrar ${p.name} en el catálogo`}
                                                    onCambiar={() => aplicar([p.id], { visible: !visible })}
                                                />
                                            </td>
                                            <td className="py-3 pl-3 pr-5 text-right">
                                                <Link
                                                    href={`/editar-producto/${p.id}`}
                                                    title="Editar producto"
                                                    aria-label={`Editar ${p.name}`}
                                                    className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.94] transition-[background-color,color,transform] duration-150"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {visibles.length > 0 && (
                    <p className="px-5 py-3 border-t border-[#E6DFD5] dark:border-[#353B33] text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                        Mostrando {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, visibles.length)} de {visibles.length}
                    </p>
                )}
            </section>

            <PaginationControls currentPage={paginaActual} totalPages={totalPaginas} onPageChange={setPagina} />

            <ConfirmModal
                isOpen={!!quitarFotoDe}
                title="Quitar la foto"
                message={`El producto "${quitarFotoDe?.name ?? ""}" vuelve a mostrarse sin foto en el catálogo.`}
                onConfirm={quitarFoto}
                onCancel={() => setQuitarFotoDe(null)}
            />
        </div>
    );
}
