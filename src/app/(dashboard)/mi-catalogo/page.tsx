"use client";

import {
    useMemo,
    useRef,
    useState,
    type DragEvent } from "react";
import Link from "next/link";
import { AnimatePresence,
    motion } from "framer-motion";
import {
    Store,
    ExternalLink,
    Plus,
    ImagePlus,
    Loader2,
    Pencil,
    Eye,
    EyeOff,
    ImageOff,
    Tags,
} from "lucide-react";
import { toast } from "sonner";
import { useAppContext, type Producto } from "@/context/AppContext";
import type { EstadoAutomatico } from "@/lib/perfume-hecho";
import { actualizarPublicaciones, guardarFotoProducto, quitarFotoProducto, type CambiosPublicacion } from "@/lib/catalogo-actions";
import { prepararFoto } from "@/lib/foto-cliente";
import { extractBrand } from "@/lib/product-utils";
import PaginationControls from "@/components/PaginationControls";
import ConfirmModal from "@/components/ConfirmModal";
import { Selector } from "@/components/Desplegable";
import Buscador from "@/components/Buscador";
import EncabezadoPagina, { BOTON_ENC, BOTON_ENC_BORDE } from "@/components/EncabezadoPagina";

const POR_PAGINA = 20;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Filtro = "publicados" | "hay" | "demora" | "sin-stock" | "sin-foto" | "no-publicados" | "todos";

const tienePrecio = (p: Producto) => Number(p.priceMinorista) > 0;
// Lo que ve un cliente: visible y con precio minorista (los "sin stock" se ven, marcados así)
const enCatalogo = (p: Producto) => p.visibleCatalogo !== false && tienePrecio(p);
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

// Los de disponibilidad y foto miran solo lo publicado (lo que ve el cliente).
// "Sin stock" aparece solo cuando hay alguno.
const FILTROS: { key: Filtro; label: string; punto?: string; siHay?: boolean; cumple: (p: Producto, auto: EstadoAutomatico) => boolean }[] = [
    { key: "publicados", label: "Publicados", cumple: enCatalogo },
    { key: "hay", label: "Con stock", punto: "bg-[#1baf7a]", cumple: (p, a) => enCatalogo(p) && a.estado === "disponible" },
    { key: "demora", label: "Con demora", punto: "bg-[#C9A877]", cumple: (p, a) => enCatalogo(p) && a.estado === "demora" },
    { key: "sin-stock", label: "Sin stock", punto: "bg-[#eb6834]", siHay: true, cumple: (p, a) => enCatalogo(p) && a.estado === "sin-stock" },
    { key: "sin-foto", label: "Sin foto", cumple: p => enCatalogo(p) && !p.imageUrl },
    { key: "no-publicados", label: "No publicados", cumple: p => !enCatalogo(p) },
    { key: "todos", label: "Todos", cumple: () => true },
];

// Disponibilidad automática (sale del stock de perfumes hechos y de la esencia de la receta)
const DISPONIBILIDAD: Record<EstadoAutomatico["estado"], { label: string; punto: string; color: string }> = {
    disponible: { label: "Hay", punto: "bg-[#1baf7a]", color: "bg-[#1baf7a]/10 text-[#128a5f] dark:text-[#4fd1a0]" },
    demora: { label: "Demora", punto: "bg-[#C9A877]", color: "bg-[#DAC4AA]/25 text-[#7A5C34] dark:text-[#DAC4AA]" },
    "sin-stock": { label: "Sin stock", punto: "bg-[#eb6834]", color: "bg-[#eb6834]/10 text-[#c4501f] dark:text-[#f2895c]" },
};
const motivo = (a: EstadoAutomatico) =>
    a.estado === "disponible" ? `${a.hechos} ${a.hechos === 1 ? "hecho" : "hechos"} en stock`
        : a.estado === "demora" ? `Sin hechos · ${a.dias} días`
            : "Esencia a consultar";

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
    const { productos, setProductosSinGuardar, categorias, isLoading, addSystemLog, disponibilidadDe: auto } = useAppContext();

    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("publicados");
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
        () => Object.fromEntries(FILTROS.map(f => [f.key, base.filter(p => f.cumple(p, auto(p))).length])) as Record<Filtro, number>,
        [base, auto],
    );
    const visibles = useMemo(() => base.filter(p => FILTROS.find(f => f.key === filtro)!.cumple(p, auto(p))), [base, filtro, auto]);
    const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const deLaPagina = visibles.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    const totalCatalogo = productos.filter(enCatalogo).length;
    const conFoto = productos.filter(p => enCatalogo(p) && p.imageUrl).length;
    const conStock = productos.filter(p => enCatalogo(p) && auto(p).estado === "disponible").length;

    const irA = (cambio: () => void) => { cambio(); setPagina(1); };

    // Cambios: se ven al instante y se guardan en el servidor; si falla, se vuelve atrás
    const aplicar = async (ids: string[], cambios: CambiosPublicacion, aviso?: string) => {
        const idsSet = new Set(ids);
        const antes = new Map(productos.filter(p => idsSet.has(p.id)).map(p => [p.id, p]));
        setProductosSinGuardar(prev => prev.map(p => !idsSet.has(p.id) ? p : {
            ...p,
            ...(cambios.visible !== undefined && { visibleCatalogo: cambios.visible }),
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

            <EncabezadoPagina icono={Store} titulo="Mi catálogo" descripcion="Lo que ven tus clientes. La disponibilidad se calcula sola con tu stock.">
            <dl className="flex items-stretch gap-2">
                {[
                    { titulo: "Publicados", valor: totalCatalogo, extra: `de ${productos.length}` },
                    { titulo: "Con stock", valor: conStock, extra: "listos" },
                ].map(d => (
                    <div key={d.titulo} className="px-3.5 py-2 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] min-w-[92px]">
                        <dt className="text-[11px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{d.titulo}</dt>
                        <dd className="text-lg font-bold tabular-nums leading-tight text-[#2C2C2C] dark:text-[#F4EFEA]">
                            {d.valor} <span className="text-xs font-medium text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{d.extra}</span>
                        </dd>
                    </div>
                ))}
                <div className="px-3.5 py-2 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] min-w-[120px]">
                    <dt className="text-[11px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Con foto</dt>
                    <dd className="text-lg font-bold tabular-nums leading-tight text-[#2C2C2C] dark:text-[#F4EFEA]">
                        {conFoto} <span className="text-xs font-medium text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">de {totalCatalogo}</span>
                    </dd>
                    <div className="mt-1 h-1 rounded-full bg-[#7D9878]/15 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-[#7D9878] dark:bg-[#A3B69B]"
                            initial={false}
                            animate={{ width: `${totalCatalogo ? Math.round((conFoto / totalCatalogo) * 100) : 0}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT }}
                        />
                    </div>
                </div>
            </dl>

            <div className="flex items-center gap-2">
                <a
                    href="/catalogo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BOTON_ENC_BORDE}
                >
                    <ExternalLink className="w-4 h-4" />
                    Ver catálogo
                </a>
                <Link
                    href="/crear-producto"
                    className={BOTON_ENC}
                >
                    <Plus className="w-4 h-4" />
                    Nuevo producto
                </Link>
            </div>
            </EncabezadoPagina>

            {/* Filtros y buscador */}
            <div className="anim-entrada [animation-delay:60ms] flex flex-wrap items-center gap-3">
                <div role="group" aria-label="Filtrar" className="shrink-0 max-w-full flex gap-1 p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {FILTROS.filter(f => !f.siHay || conteos[f.key] > 0 || filtro === f.key).map(f => {
                        const activo = filtro === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => irA(() => setFiltro(f.key))}
                                aria-pressed={activo}
                                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${activo
                                    ? "bg-white dark:bg-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                            >
                                {f.punto && <span className={`w-1.5 h-1.5 rounded-full ${f.punto}`} />}
                                {f.label}
                                <span className="text-xs font-medium tabular-nums text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{conteos[f.key]}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex-1 min-w-[min(100%,420px)] flex gap-3">
                    <Selector
                        value={categoria}
                        onChange={(e) => irA(() => setCategoria(e.target.value))}
                        aria-label="Categoría"
                        icono={<Tags className="w-4 h-4" />}
                        resaltado={categoria !== "Todas"}
                        className="h-10 bg-white w-52 shrink-0"
                    >
                        <option value="Todas">Todas las categorías</option>
                        {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </Selector>
                    <Buscador
                        valor={busqueda}
                        onCambiar={v => irA(() => setBusqueda(v))}
                        placeholder="Buscar producto…"
                        aria-label="Buscar producto"
                        className="flex-1 min-w-0"
                    />
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
                                    const disp = auto(p);
                                    const d = DISPONIBILIDAD[disp.estado];
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
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap ${d.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${d.punto}`} />
                                                        {d.label}
                                                    </span>
                                                    <span className="text-[11px] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 whitespace-nowrap">{motivo(disp)}</span>
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
