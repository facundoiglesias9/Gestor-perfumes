"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Archive, ArrowLeft, Check, FlaskConical, Minus, Package, PackagePlus, Plus, Search, Sparkles, TriangleAlert, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAppContext, buscarPerfumeHecho, type LineaIngresoStock } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import ConfirmModal from "@/components/ConfirmModal";
import Desplegable from "@/components/Desplegable";
import { PanelVentana, PieVentana, BotonCerrar, FilaInterruptor, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO, BOTON_BORDE } from "@/components/ventana-partes";
import Buscador from "@/components/Buscador";

// Ventana "Ingresar stock" del Inventario, en dos partes:
//  · izquierda: buscador y filtros para encontrar lo que llegó o lo que se preparó;
//  · derecha ("Para cargar"): lo elegido, cada uno con su cantidad, y se carga todo junto.
// En el celular las dos partes se ven de a una (abajo se cambia entre "lista" y "elegidos").

type Tipo = LineaIngresoStock["tipo"];

const TIPOS: { tipo: Tipo; titulo: string; extra?: string; Icono: typeof Sparkles }[] = [
    { tipo: "Perfume Hecho", titulo: "Perfumes", extra: "hechos", Icono: Sparkles },
    { tipo: "Esencia", titulo: "Esencias", Icono: FlaskConical },
    { tipo: "Insumo", titulo: "Insumos", Icono: Package },
];

const NOMBRE_PRESENTACION: Record<string, string> = {
    "Frascos de 50 ML": "50 ml",
    "Frascos de 30 ML": "30 ml",
    "Frascos Difusores": "Difusor",
    "Frascos de Auto": "Auto",
};
const ORDEN_PRESENTACION = Object.keys(NOMBRE_PRESENTACION);
const POR_TANDA = 50;

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mismo = (a?: string, b?: string) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
// "212 VIP (CAROLINA HERRERA) 50 ML" → "212 VIP (CAROLINA HERRERA)": el tamaño se muestra aparte, bien marcado
const sinPresentacion = (nombre: string) => nombre.replace(/\s+(\d+\s*ML|DIFUSOR|AUTO)\s*$/i, "");
const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const claveDe = (tipo: Tipo, id: string) => `${tipo}|${id}`;
const separarClave = (clave: string) => {
    const i = clave.indexOf("|");
    return { tipo: clave.slice(0, i) as Tipo, id: clave.slice(i + 1) };
};

type Fila = {
    clave: string;
    tipo: Tipo;
    nombre: string;
    nombreCompleto: string;
    presentacion?: string;
    genero?: string;
    detalle?: string;
    hay: number;
    unidad: string;
    /** Se cuenta por unidades (con − y +); si no, se escribe la cantidad (gramos, ml) */
    entero: boolean;
    texto: string;
};

export default function IngresarStock({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
    // Si ya se eligió algo, antes de cerrar se pregunta (para no perderlo por tocar Escape o la X)
    const conCambios = useRef(false);
    const [confirmarSalida, setConfirmarSalida] = useState(false);
    const pedirCierre = () => (conCambios.current ? setConfirmarSalida(true) : onCerrar());
    const cerrar = () => {
        conCambios.current = false;
        setConfirmarSalida(false);
        onCerrar();
    };

    return (
        <>
            <Ventana abierta={abierta} onCerrar={pedirCierre} cerrarAlTocarFondo={false} etiqueta="Ingresar stock">
                {abierta && <Contenido onCerrar={pedirCierre} onListo={cerrar} onCambios={hay => { conCambios.current = hay; }} />}
            </Ventana>
            <ConfirmModal
                isOpen={confirmarSalida}
                title="¿Salir sin cargar?"
                message="Lo que elegiste todavía no se cargó. Si salís, se pierde."
                confirmText="Salir sin cargar"
                onConfirm={cerrar}
                onCancel={() => setConfirmarSalida(false)}
            />
        </>
    );
}

function Contenido({ onCerrar, onListo, onCambios }: { onCerrar: () => void; onListo: () => void; onCambios: (hay: boolean) => void }) {
    const { productos, esencias, insumos, inventario, ingresarStock } = useAppContext();
    const [tipo, setTipo] = useState<Tipo>("Perfume Hecho");
    const [busqueda, setBusqueda] = useState("");
    const [presentacion, setPresentacion] = useState("todas");
    const [genero, setGenero] = useState("todos");
    const [cantidades, setCantidades] = useState<Record<string, string>>({});
    const [descontarLoUsado, setDescontarLoUsado] = useState(true);
    const [vista, setVista] = useState<"lista" | "elegidos">("lista");
    const [intentoCargar, setIntentoCargar] = useState(false);
    const [aviso, setAviso] = useState("");
    const buscador = useRef<HTMLInputElement>(null);
    const lista = useRef<HTMLDivElement>(null);

    const elegidas = Object.keys(cantidades);
    useEffect(() => { onCambios(elegidas.length > 0); }, [elegidas.length, onCambios]);

    // En compu el cursor arranca en el buscador; en el celular no, así el teclado no tapa la lista
    useEffect(() => {
        if (window.matchMedia("(min-width: 1024px)").matches) buscador.current?.focus();
    }, []);

    const filas = useMemo<Fila[]>(() => {
        const porNombre = (a: Fila, b: Fila) => a.nombre.localeCompare(b.nombre, "es");
        const perfumes = productos.map((p): Fila => ({
            clave: claveDe("Perfume Hecho", p.id),
            tipo: "Perfume Hecho",
            nombre: sinPresentacion(p.name),
            nombreCompleto: p.name,
            presentacion: p.category,
            genero: p.gender,
            hay: Number(buscarPerfumeHecho(inventario, p)?.qty || 0),
            unidad: "u.",
            entero: true,
            texto: normalizar(`${p.name} ${p.gender} ${NOMBRE_PRESENTACION[p.category] ?? p.category}`),
        })).sort(porNombre);
        const deEsencias = esencias.map((e): Fila => ({
            clave: claveDe("Esencia", e.id),
            tipo: "Esencia",
            nombre: e.name,
            nombreCompleto: e.name,
            genero: e.gender,
            detalle: e.provider,
            hay: Number(e.qty || 0),
            unidad: "g",
            entero: false,
            texto: normalizar(`${e.name} ${e.gender ?? ""} ${e.provider ?? ""}`),
        })).sort(porNombre);
        const deInsumos = insumos.map((i): Fila => {
            const unidad = i.unit || "un.";
            return {
                clave: claveDe("Insumo", i.id),
                tipo: "Insumo",
                nombre: i.name,
                nombreCompleto: i.name,
                detalle: i.category === "Todas" ? "Para todo" : (NOMBRE_PRESENTACION[i.category] ?? i.category),
                hay: Number(i.stock || 0),
                unidad,
                entero: /^u/i.test(unidad),
                texto: normalizar(`${i.name} ${i.category} ${i.provider ?? ""}`),
            };
        }).sort(porNombre);
        return [...perfumes, ...deEsencias, ...deInsumos];
    }, [productos, esencias, insumos, inventario]);

    const porClave = useMemo(() => new Map(filas.map(f => [f.clave, f])), [filas]);

    // ── Filtros (cada uno cuenta lo que quedaría con los otros filtros puestos) ──
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    const delTipo = filas.filter(f => f.tipo === tipo);
    const coincideTexto = (f: Fila) => palabras.every(p => f.texto.includes(p));
    const coincidePresentacion = (f: Fila) => presentacion === "todas" || f.presentacion === presentacion;

    const presentaciones = tipo !== "Perfume Hecho" ? [] : (() => {
        const cuenta = new Map<string, number>();
        delTipo.forEach(f => {
            if (!f.presentacion) return;
            const suma = coincideTexto(f) && (genero === "todos" || f.genero === genero) ? 1 : 0;
            cuenta.set(f.presentacion, (cuenta.get(f.presentacion) || 0) + suma);
        });
        const orden = (c: string) => ORDEN_PRESENTACION.includes(c) ? ORDEN_PRESENTACION.indexOf(c) : ORDEN_PRESENTACION.length;
        return [...cuenta.keys()]
            .sort((a, b) => orden(a) - orden(b) || a.localeCompare(b, "es"))
            .map(valor => ({ valor, titulo: NOMBRE_PRESENTACION[valor] ?? valor, n: cuenta.get(valor) || 0 }));
    })();

    const generos = [...new Set(delTipo.filter(coincidePresentacion).map(f => f.genero).filter((g): g is string => !!g))]
        .sort((a, b) => a.localeCompare(b, "es"));
    const generoActivo = generos.includes(genero) ? genero : "todos";

    const resultado = delTipo.filter(f => coincidePresentacion(f) && (generoActivo === "todos" || f.genero === generoActivo) && coincideTexto(f));
    const hayFiltros = palabras.length > 0 || presentacion !== "todas" || generoActivo !== "todos";

    // Se muestran de a 50; "Mostrar más" suma otra tanda. Al cambiar un filtro vuelve a 50.
    const firma = `${tipo}|${busqueda}|${presentacion}|${generoActivo}`;
    const [tanda, setTanda] = useState({ firma, n: POR_TANDA });
    const limite = tanda.firma === firma ? tanda.n : POR_TANDA;
    const visibles = resultado.slice(0, limite);

    const alPrincipio = () => lista.current?.scrollTo({ top: 0 });
    const cambiarTipo = (t: Tipo) => {
        if (t === tipo) return;
        setTipo(t);
        setBusqueda("");
        setPresentacion("todas");
        setGenero("todos");
        alPrincipio();
    };
    const limpiarFiltros = () => {
        setBusqueda("");
        setPresentacion("todas");
        setGenero("todos");
        alPrincipio();
    };

    // ── Elegidos ──
    const agregar = (f: Fila) => {
        if (f.clave in cantidades) return;
        setCantidades(prev => ({ ...prev, [f.clave]: f.entero ? "1" : "" }));
        setAviso(`Agregado: ${f.nombreCompleto}`);
    };
    const quitar = (f: Fila) => {
        setCantidades(prev => {
            const resto = { ...prev };
            delete resto[f.clave];
            return resto;
        });
        setAviso(`Quitado: ${f.nombreCompleto}`);
    };
    const quitarTodo = () => {
        setCantidades({});
        setVista("lista");
        setAviso("Se quitaron todos");
    };
    const cambiarCantidad = (clave: string, valor: string) => setCantidades(prev => ({ ...prev, [clave]: valor }));

    const filasElegidas = elegidas.map(c => porClave.get(c)).filter((f): f is Fila => !!f);
    const elegidasPorTipo = (t: Tipo) => filasElegidas.filter(f => f.tipo === t).length;
    const hayPerfumes = filasElegidas.some(f => f.tipo === "Perfume Hecho");
    const faltaCantidad = (f: Fila) => !(Number(cantidades[f.clave]) > 0);
    const sinCantidad = filasElegidas.find(faltaCantidad);
    const unidades = filasElegidas.filter(f => f.entero).reduce((acc, f) => acc + (Number(cantidades[f.clave]) || 0), 0);
    const vistaActual = elegidas.length === 0 ? "lista" : vista;

    // Lo que usan las recetas de los perfumes elegidos (para mostrarlo antes de descontarlo)
    const materiales = useMemo(() => {
        const uso = new Map<string, { nombre: string; cantidad: number; hay: number; unidad: string; existe: boolean }>();
        for (const [clave, valor] of Object.entries(cantidades)) {
            if (!clave.startsWith("Perfume Hecho|")) continue;
            const n = Number(valor) || 0;
            const producto = n > 0 ? productos.find(p => p.id === separarClave(clave).id) : undefined;
            for (const comp of producto?.components || []) {
                let item: { id: string; name: string; hay: number; unidad: string } | undefined;
                if (comp.type === "Esencia") {
                    const e = esencias.find(x => x.id === comp.id) ?? esencias.find(x => mismo(x.name, comp.name));
                    if (e) item = { id: e.id, name: e.name, hay: Number(e.qty || 0), unidad: "g" };
                } else {
                    const i = insumos.find(x => x.id === comp.id) ?? insumos.find(x => mismo(x.name, comp.name));
                    if (i) item = { id: i.id, name: i.name, hay: Number(i.stock || 0), unidad: i.unit || "un." };
                }
                const k = item ? `${comp.type}|${item.id}` : `?|${comp.name}`;
                const actual = uso.get(k) ?? { nombre: item?.name ?? comp.name, cantidad: 0, hay: item?.hay ?? 0, unidad: item?.unidad ?? "", existe: !!item };
                actual.cantidad += comp.qty * n;
                uso.set(k, actual);
            }
        }
        return [...uso.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    }, [cantidades, productos, esencias, insumos]);
    const noAlcanzan = materiales.filter(m => !m.existe || m.cantidad > m.hay).length;

    const cargar = (e: React.FormEvent) => {
        e.preventDefault();
        if (filasElegidas.length === 0) return;
        if (sinCantidad) {
            // El error se marca al lado del campo y el cursor va ahí
            setIntentoCargar(true);
            setVista("elegidos");
            requestAnimationFrame(() => {
                const campo = [...document.querySelectorAll<HTMLInputElement>(`[data-cantidad="${CSS.escape(sinCantidad.clave)}"]`)].find(el => el.offsetParent !== null);
                campo?.focus();
            });
            return;
        }
        const lineas = filasElegidas.map(f => ({ ...separarClave(f.clave), cantidad: Number(cantidades[f.clave]) }));
        ingresarStock(lineas, { descontarLoUsado: hayPerfumes && descontarLoUsado });

        const resumen = filasElegidas.map(f => f.entero
            ? `${numero(Number(cantidades[f.clave]))} × ${f.nombreCompleto}`
            : `${numero(Number(cantidades[f.clave]))} ${f.unidad} de ${f.nombreCompleto}`);
        toast.success(lineas.length === 1 ? "Stock ingresado" : `Stock ingresado: ${lineas.length} ítems`, {
            description: resumen.slice(0, 4).join(" · ") + (resumen.length > 4 ? ` y ${resumen.length - 4} más` : ""),
        });
        onListo();
    };

    // Flechas izquierda/derecha para moverse entre "Perfumes / Esencias / Insumos"
    const teclasPestanas = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = TIPOS.findIndex(t => t.tipo === tipo);
        const siguiente = TIPOS[(i + (e.key === "ArrowRight" ? 1 : TIPOS.length - 1)) % TIPOS.length];
        cambiarTipo(siguiente.tipo);
        e.currentTarget.querySelector<HTMLButtonElement>(`[data-tipo="${siguiente.tipo}"]`)?.focus();
    };

    const nombreTipo = tipo === "Perfume Hecho" ? "perfumes" : tipo === "Esencia" ? "esencias" : "insumos";
    const textoBuscador = tipo === "Perfume Hecho" ? "Buscá por nombre, marca o género" : tipo === "Esencia" ? "Buscá la esencia" : "Buscá el insumo";

    return (
        <PanelVentana ancho="2xl" alto="pantalla" aria-labelledby="ingresar-stock-titulo">
            {/* Encabezado: título, qué se carga y cerrar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-5 sm:px-6 py-4 border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 shrink-0">
                <div className="flex items-center gap-3 min-w-0 mr-auto">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]">
                        <Archive className="w-5 h-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A7356] dark:text-[#A3B69B]">Inventario</p>
                        <h2 id="ingresar-stock-titulo" className="text-xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Ingresar stock</h2>
                    </div>
                </div>

                <div
                    role="tablist"
                    aria-label="Qué ingresa"
                    onKeyDown={teclasPestanas}
                    className={`order-last w-full lg:order-none lg:w-auto grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#F4EFE7] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] ${vistaActual === "elegidos" ? "hidden lg:grid" : ""}`}
                >
                    {TIPOS.map(({ tipo: t, titulo, extra, Icono }) => {
                        const activo = tipo === t;
                        const n = elegidasPorTipo(t);
                        return (
                            <button
                                key={t}
                                type="button"
                                role="tab"
                                data-tipo={t}
                                aria-selected={activo}
                                aria-controls="ingreso-lista"
                                tabIndex={activo ? 0 : -1}
                                onClick={() => cambiarTipo(t)}
                                className={`relative h-10 px-3 lg:px-4 rounded-xl text-sm font-semibold cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activo ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                            >
                                {activo && (
                                    <motion.span
                                        layoutId="ingreso-tipo"
                                        className="absolute inset-0 rounded-xl bg-white dark:bg-[#30352F] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                        transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
                                    />
                                )}
                                <span className="relative flex items-center justify-center gap-2 min-w-0">
                                    <Icono className="w-4 h-4 shrink-0" aria-hidden />
                                    <span className="truncate">{titulo}{extra && <span className="hidden sm:inline"> {extra}</span>}</span>
                                    {n > 0 && (
                                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#7D9878] text-white text-[11px] font-bold tabular-nums inline-flex items-center justify-center">
                                            {n}<span className="sr-only"> elegidos</span>
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <BotonCerrar onClick={onCerrar} />
            </div>

            <p className="sr-only" aria-live="polite">{aviso}</p>

            <form onSubmit={cargar} className="flex flex-col flex-1 min-h-0">
                <div className="flex flex-1 min-h-0">
                    {/* ── Lista para elegir ── */}
                    <section aria-label={`Elegir ${nombreTipo}`} className={`${vistaActual === "elegidos" ? "hidden lg:flex" : "flex"} flex-1 min-w-0 flex-col`}>
                        <div className="px-5 sm:px-6 pt-5 pb-3 space-y-3 shrink-0">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Buscador
                                    valor={busqueda}
                                    onCambiar={v => { setBusqueda(v); alPrincipio(); }}
                                    placeholder={textoBuscador}
                                    aria-label={`Buscar ${nombreTipo}`}
                                    ref={buscador}
                                    onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                                    enterKeyHint="search"
                                    fondo="crema"
                                    className="flex-1 min-w-0"
                                />
                                {generos.length > 1 && (
                                    <Desplegable
                                        valor={generoActivo}
                                        opciones={[{ valor: "todos", titulo: "Todos los géneros" }, ...generos.map(g => ({ valor: g, titulo: g }))]}
                                        onCambiar={v => { setGenero(v); alPrincipio(); }}
                                        etiqueta="Género"
                                        icono={<Users className="w-4 h-4" />}
                                        alto="lg"
                                        resaltado={generoActivo !== "todos"}
                                        className="sm:w-52 shrink-0"
                                    />
                                )}
                            </div>

                            {presentaciones.length > 1 && (
                                <div role="radiogroup" aria-label="Presentación" className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
                                    {[{ valor: "todas", titulo: "Todas", n: undefined as number | undefined }, ...presentaciones].map(p => {
                                        const activa = presentacion === p.valor;
                                        return (
                                            <button
                                                key={p.valor}
                                                type="button"
                                                role="radio"
                                                aria-checked={activa}
                                                onClick={() => { setPresentacion(p.valor); alPrincipio(); }}
                                                className={`shrink-0 h-10 px-3.5 rounded-full border inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer active:scale-[0.97] transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${activa
                                                    ? "bg-[#2C2C2C] border-[#2C2C2C] text-white dark:bg-[#F4EFEA] dark:border-[#F4EFEA] dark:text-[#1B1D1A]"
                                                    : "border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:border-[#7D9878]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                            >
                                                {p.titulo}
                                                {p.n !== undefined && <span className={`text-xs font-medium tabular-nums ${activa ? "opacity-70" : "opacity-50"}`}>{p.n}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-5 sm:px-6 pb-2 flex items-center justify-between gap-3 shrink-0">
                            <p className="text-[13px] font-medium text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50" aria-live="polite">
                                {numero(resultado.length)} {resultado.length === 1 ? nombreTipo.slice(0, -1) : nombreTipo}
                            </p>
                            {hayFiltros && (
                                <button type="button" onClick={limpiarFiltros} className="text-[13px] font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline underline-offset-2">
                                    Limpiar filtros
                                </button>
                            )}
                        </div>

                        <div id="ingreso-lista" role="tabpanel" aria-label={nombreTipo} ref={lista} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar px-3 sm:px-4 pb-4">
                            {visibles.length > 0 ? (
                                <ul className="space-y-1">
                                    {visibles.map(f => (
                                        <FilaLista
                                            key={f.clave}
                                            fila={f}
                                            cantidad={cantidades[f.clave]}
                                            error={intentoCargar && f.clave in cantidades && faltaCantidad(f)}
                                            onAgregar={() => agregar(f)}
                                            onCantidad={v => cambiarCantidad(f.clave, v)}
                                        />
                                    ))}
                                </ul>
                            ) : (
                                <div className="h-full min-h-48 flex flex-col items-center justify-center text-center px-6">
                                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#2C2C2C]/[0.05] dark:bg-white/[0.06] text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">
                                        <Search className="w-5 h-5" aria-hidden />
                                    </span>
                                    <p className="mt-3 text-sm font-medium text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65">No hay {nombreTipo} con esa búsqueda.</p>
                                    {hayFiltros && (
                                        <button type="button" onClick={limpiarFiltros} className={`${BOTON_BORDE} mt-4`}>
                                            Limpiar filtros
                                        </button>
                                    )}
                                </div>
                            )}
                            {resultado.length > limite && (
                                <div className="pt-3 flex justify-center">
                                    <button type="button" onClick={() => setTanda({ firma, n: limite + POR_TANDA })} className={BOTON_BORDE}>
                                        Mostrar más
                                        <span className="text-xs font-medium opacity-60 tabular-nums">quedan {numero(resultado.length - limite)}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Para cargar ── */}
                    <aside
                        aria-labelledby="para-cargar-titulo"
                        className={`${vistaActual === "elegidos" ? "flex" : "hidden lg:flex"} w-full lg:w-[22rem] shrink-0 flex-col lg:border-l border-[#E6DFD5]/70 dark:border-[#353B33]/70 bg-[#FBF9F5] dark:bg-[#1F221E]`}
                    >
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 shrink-0">
                            <h3 id="para-cargar-titulo" className="text-base font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                Para cargar
                                {elegidas.length > 0 && <span className="ml-1.5 text-sm font-medium text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 tabular-nums">({elegidas.length})</span>}
                            </h3>
                            {elegidas.length > 0 && (
                                <button type="button" onClick={quitarTodo} className="h-8 px-2 -mr-2 rounded-lg text-[13px] font-semibold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 hover:text-[#B5654A] dark:hover:text-[#DBA793] transition-colors duration-150">
                                    Quitar todo
                                </button>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar px-5 pb-5">
                            {filasElegidas.length === 0 ? (
                                <div className="h-full min-h-48 flex flex-col items-center justify-center text-center px-4">
                                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]">
                                        <PackagePlus className="w-5 h-5" aria-hidden />
                                    </span>
                                    <p className="mt-3 text-sm font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">Todavía no elegiste nada</p>
                                    <p className="mt-1 text-[13px] leading-relaxed text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                        Tocá <span className="font-semibold">Agregar</span> en la lista. Podés sumar varios y cargarlos todos juntos.
                                    </p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {filasElegidas.map(f => (
                                        <TarjetaElegida
                                            key={f.clave}
                                            fila={f}
                                            cantidad={cantidades[f.clave]}
                                            error={intentoCargar && faltaCantidad(f)}
                                            onCantidad={v => cambiarCantidad(f.clave, v)}
                                            onQuitar={() => quitar(f)}
                                        />
                                    ))}
                                </ul>
                            )}

                            {/* Perfumes hechos: si se prepararon con el stock propio, sale lo que usó cada receta */}
                            {hayPerfumes && (
                                <section aria-label="Materiales usados" className="mt-5 pt-5 border-t border-[#E6DFD5] dark:border-[#353B33]">
                                    <div className="rounded-2xl bg-white dark:bg-[#242723]">
                                        <FilaInterruptor
                                            titulo="Descontar lo que usé"
                                            descripcion={descontarLoUsado ? "Resta la esencia, el alcohol, el frasco y lo demás de cada receta." : "No se toca el stock de esencias ni de insumos."}
                                            activo={descontarLoUsado}
                                            onCambiar={setDescontarLoUsado}
                                        />
                                    </div>
                                    {descontarLoUsado && materiales.length > 0 && (
                                        <div className="mt-4">
                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">Se descuenta</p>
                                            <ul className="space-y-2">
                                                {materiales.map(m => {
                                                    const falta = !m.existe || m.cantidad > m.hay;
                                                    return (
                                                        <li key={m.nombre} className="text-[13px]">
                                                            <div className="flex items-baseline justify-between gap-3">
                                                                <span className={`min-w-0 truncate ${falta ? "text-[#97604D] dark:text-[#DBA793]" : "text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65"}`} title={m.nombre}>
                                                                    {falta && <TriangleAlert className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-label="No alcanza" />}
                                                                    {m.nombre}
                                                                </span>
                                                                <span className="shrink-0 tabular-nums font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">−{numero(m.cantidad)} {m.unidad}</span>
                                                            </div>
                                                            {falta && (
                                                                <p className="text-xs text-[#97604D] dark:text-[#DBA793]">
                                                                    {m.existe ? `Hay ${numero(m.hay)} ${m.unidad}: queda en 0` : "No está cargado como esencia o insumo"}
                                                                </p>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            {noAlcanzan > 0 && (
                                                <p className="mt-4 flex gap-2 rounded-xl bg-[#C9866F]/10 px-3 py-2.5 text-xs leading-relaxed text-[#97604D] dark:text-[#DBA793]">
                                                    <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden />
                                                    {noAlcanzan === 1 ? "Un material no alcanza. Se carga igual y ese queda en 0." : `${noAlcanzan} materiales no alcanzan. Se carga igual y esos quedan en 0.`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>
                    </aside>
                </div>

                <PieVentana>
                    <div className="flex items-center gap-2 min-w-0">
                        <button type="button" onClick={onCerrar} className={`${BOTON_SECUNDARIO} ${elegidas.length > 0 ? "hidden lg:inline-flex" : ""}`}>
                            Cancelar
                        </button>
                        {elegidas.length > 0 && (
                            <button type="button" onClick={() => setVista(vistaActual === "lista" ? "elegidos" : "lista")} className={`${BOTON_BORDE} h-11 lg:hidden`}>
                                {vistaActual === "lista"
                                    ? <>Ver elegidos <span className="tabular-nums">({elegidas.length})</span></>
                                    : <><ArrowLeft className="w-4 h-4" aria-hidden />Seguir eligiendo</>}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4 min-w-0">
                        <p className={`hidden sm:block text-sm tabular-nums truncate ${intentoCargar && sinCantidad ? "text-[#97604D] dark:text-[#DBA793] font-medium" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50"}`}>
                            {intentoCargar && sinCantidad
                                ? `Falta la cantidad de ${sinCantidad.nombre}`
                                : elegidas.length === 0
                                    ? "Nada elegido"
                                    : `${elegidas.length} ${elegidas.length === 1 ? "ítem" : "ítems"}${unidades > 0 ? ` · ${numero(unidades)} ${unidades === 1 ? "unidad" : "unidades"}` : ""}`}
                        </p>
                        <button type="submit" disabled={elegidas.length === 0} className={BOTON_PRINCIPAL}>
                            <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden />
                            Ingresar stock
                        </button>
                    </div>
                </PieVentana>
            </form>
        </PanelVentana>
    );
}

// ── Piezas ───────────────────────────────────────────────────────

const COLOR_GENERO: Record<string, string> = {
    Femenino: "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]",
    Masculino: "bg-[#7D9878]/12 text-[#4F684B] dark:text-[#A3B69B]",
};

function Genero({ genero }: { genero: string }) {
    return (
        <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide leading-none ${COLOR_GENERO[genero] ?? "bg-[#2C2C2C]/[0.06] dark:bg-white/[0.08] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}>
            {genero}
        </span>
    );
}

/** Cuadrito de la izquierda: el tamaño bien marcado (50 ml / 30 ml) o el ícono del tipo */
function Distintivo({ fila: f, chico }: { fila: Fila; chico?: boolean }) {
    const tam = chico ? "w-10 h-10" : "w-12 h-12";
    const ml = f.presentacion?.match(/(\d+)\s*ML/i)?.[1];
    if (ml) {
        return (
            <span className={`${tam} shrink-0 rounded-xl flex flex-col items-center justify-center bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A]`} aria-label={`${ml} ml`}>
                <span className={`${chico ? "text-sm" : "text-lg"} font-black leading-none tabular-nums`}>{ml}</span>
                <span className="text-[10px] font-bold leading-none mt-0.5">ml</span>
            </span>
        );
    }
    if (f.presentacion) {
        return (
            <span className={`${tam} shrink-0 rounded-xl flex items-center justify-center bg-[#2C2C2C]/[0.07] dark:bg-white/[0.08] text-[10px] font-bold uppercase tracking-wide text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75`}>
                {NOMBRE_PRESENTACION[f.presentacion] ?? f.presentacion}
            </span>
        );
    }
    const Icono = f.tipo === "Esencia" ? FlaskConical : Package;
    return (
        <span className={`${tam} shrink-0 rounded-xl flex items-center justify-center bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]`}>
            <Icono className="w-5 h-5" aria-hidden />
        </span>
    );
}

function textoHay(f: Fila) {
    if (f.tipo === "Perfume Hecho") return f.hay > 0 ? `${numero(f.hay)} ${f.hay === 1 ? "hecho" : "hechos"}` : "Sin hechos";
    return f.hay > 0 ? `Hay ${numero(f.hay)} ${f.unidad}` : "Sin stock";
}

function FilaLista({ fila: f, cantidad, error, onAgregar, onCantidad }: {
    fila: Fila;
    cantidad: string | undefined;
    error: boolean;
    onAgregar: () => void;
    onCantidad: (v: string) => void;
}) {
    const elegida = cantidad !== undefined;
    return (
        <li
            // Tocar cualquier parte de la fila la agrega (el botón "Agregar" es el camino con teclado)
            onClick={e => { if (!elegida && !(e.target as HTMLElement).closest("button, input")) onAgregar(); }}
            className={`flex items-center gap-3 rounded-2xl pl-2.5 pr-2 py-2.5 transition-colors duration-150 ${elegida
                ? "bg-[#7D9878]/[0.09] dark:bg-[#7D9878]/[0.14]"
                : "cursor-pointer hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A]"}`}
        >
            <Distintivo fila={f} />
            <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-[#2C2C2C] dark:text-[#F4EFEA] truncate" title={f.nombreCompleto}>{f.nombre}</p>
                <p className="mt-1 flex items-center gap-2 text-[13px] text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 min-w-0">
                    {f.genero && <Genero genero={f.genero} />}
                    {f.detalle && <span className="truncate">{f.detalle}</span>}
                    <span className={`shrink-0 ${f.hay > 0 ? "font-medium text-[#4F684B] dark:text-[#A3B69B]" : ""}`}>{textoHay(f)}</span>
                </p>
            </div>
            {elegida ? (
                <Cantidad fila={f} valor={cantidad} error={error} onCambiar={onCantidad} enfocar={!f.entero} />
            ) : (
                <button
                    type="button"
                    onClick={onAgregar}
                    aria-label={`Agregar ${f.nombreCompleto}`}
                    className="shrink-0 h-10 w-10 sm:w-auto sm:px-3.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 cursor-pointer hover:border-[#7D9878] hover:text-[#3F5A3C] dark:hover:text-[#C5D6BF] active:scale-[0.96] transition-[border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                >
                    <Plus className="w-4 h-4" aria-hidden />
                    <span className="hidden sm:inline">Agregar</span>
                </button>
            )}
        </li>
    );
}

function TarjetaElegida({ fila: f, cantidad, error, onCantidad, onQuitar }: {
    fila: Fila;
    cantidad: string;
    error: boolean;
    onCantidad: (v: string) => void;
    onQuitar: () => void;
}) {
    const tipo = f.tipo === "Perfume Hecho" ? "Perfume hecho" : f.tipo;
    return (
        <li className="anim-fila rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-3.5">
            <div className="flex items-start gap-3">
                <Distintivo fila={f} chico />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-[#2C2C2C] dark:text-[#F4EFEA] line-clamp-2" title={f.nombreCompleto}>{f.nombre}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 min-w-0">
                        <span className="shrink-0">{tipo}</span>
                        {f.genero && <Genero genero={f.genero} />}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onQuitar}
                    aria-label={`Quitar ${f.nombreCompleto}`}
                    title="Quitar"
                    className="w-9 h-9 -mt-1.5 -mr-1.5 rounded-lg flex items-center justify-center shrink-0 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#B5654A] dark:hover:text-[#DBA793] hover:bg-[#C9866F]/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className={`text-xs font-medium ${error ? "text-[#97604D] dark:text-[#DBA793]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50"}`}>
                    {error ? "Poné la cantidad" : f.entero ? "Cantidad" : `Cantidad en ${f.unidad}`}
                </span>
                <Cantidad fila={f} valor={cantidad} error={error} onCambiar={onCantidad} grande />
            </div>
        </li>
    );
}

function Cantidad({ fila: f, valor, error, onCambiar, grande, enfocar }: {
    fila: Fila;
    valor: string;
    error: boolean;
    onCambiar: (v: string) => void;
    grande?: boolean;
    enfocar?: boolean;
}) {
    const n = Number(valor) || 0;
    const alto = grande ? "h-11" : "h-10";
    const borde = error
        ? "border-[#C9866F] ring-2 ring-[#C9866F]/20"
        : "border-[#E6DFD5] dark:border-[#353B33] focus:border-[#7D9878]/70 focus:ring-2 focus:ring-[#7D9878]/20";
    const campo = `${alto} rounded-xl bg-white dark:bg-[#1B1D1A] border ${borde} text-base font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] outline-none transition-[border-color,box-shadow] duration-150 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
    const paso = `${alto} ${grande ? "w-11" : "w-10"} rounded-xl flex items-center justify-center shrink-0 text-[#2C2C2C]/65 dark:text-[#F4EFEA]/65 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/[0.08] active:scale-[0.92] disabled:opacity-30 disabled:pointer-events-none transition-[background-color,color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50`;

    if (f.entero) {
        return (
            <div role="group" aria-label={`Cantidad de ${f.nombreCompleto}`} className="flex items-center gap-1 shrink-0 [animation:anim-aparecer_160ms_cubic-bezier(0.23,1,0.32,1)]">
                <button type="button" onClick={() => onCambiar(String(Math.max(1, n - 1)))} disabled={n <= 1} aria-label="Uno menos" className={paso}>
                    <Minus className="w-4 h-4" />
                </button>
                <input
                    data-cantidad={f.clave}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={valor}
                    onChange={e => onCambiar(e.target.value.replace(/\D/g, ""))}
                    onFocus={e => e.target.select()}
                    aria-label="Unidades"
                    aria-invalid={error || undefined}
                    className={`${campo} ${grande ? "w-14" : "w-12"} text-center`}
                />
                <button type="button" onClick={() => onCambiar(String(n + 1))} aria-label="Uno más" className={paso}>
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        );
    }
    return (
        <span className="relative shrink-0 [animation:anim-aparecer_160ms_cubic-bezier(0.23,1,0.32,1)]">
            <input
                data-cantidad={f.clave}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={valor}
                autoFocus={enfocar}
                placeholder="0"
                onChange={e => onCambiar(e.target.value)}
                onFocus={e => e.target.select()}
                aria-label={`Cantidad de ${f.nombreCompleto} en ${f.unidad}`}
                aria-invalid={error || undefined}
                className={`${campo} ${grande ? "w-32" : "w-28"} pl-3 pr-10 placeholder:text-[#2C2C2C]/30 dark:placeholder:text-[#F4EFEA]/30`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">{f.unidad}</span>
        </span>
    );
}
