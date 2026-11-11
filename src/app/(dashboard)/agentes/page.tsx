"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
    Bot, PackageSearch, TrendingUp, LayoutGrid, Play, LoaderCircle, Check, ArrowRight,
    AlertTriangle, Eye, CheckCircle2, Info, Sparkles, Clock, PlugZap, FileSearch, Megaphone, Users, Lightbulb, Calculator, Handshake, ShoppingCart, Activity, MousePointerClick, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import EncabezadoPagina, { BOTON_ENC } from "@/components/EncabezadoPagina";
import Ventana from "@/components/Ventana";
import { PanelVentana, PieVentana, BotonCerrar, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { ejecutarAgente, estadoAgentes, guardarRevisionNavegador, fotosCatalogo } from "@/lib/agentes-actions";
import { agenteExperiencia } from "@/lib/agente-experiencia";
import { agenteLogs, type RegistroLog } from "@/lib/agente-logs";
import dynamic from "next/dynamic";
import { MS_POR_PASO, MS_RECORRIDO, MS_REUNION, PLAN, type SalaEquipo } from "./recorridos";
import type { Reunion } from "./Oficina3D";

// La oficina 3D se carga aparte y solo en el navegador: así el resto del sistema no carga el motor 3D
const Oficina3D = dynamic(() => import("./Oficina3D"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[calc(100dvh-200px)] min-h-[520px] rounded-[1.75rem] border border-[#D9CFBF] dark:border-[#2A2E29] bg-[#E9E2D6] dark:bg-[#141613] flex items-center justify-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
            Armando la oficina…
        </div>
    ),
});
import { AGENTES, ASISTENTES, type IdAgente, type ResultadoAgente, type Hallazgo, type Metrica, type Equipo, type Propuesta } from "@/lib/agentes-tipos";

// Agentes del negocio: cada uno revisa una parte de Scenta con los datos reales y deja lo que
// encontró. Acá se los ve trabajar (bitácora paso a paso) y se lee el resultado.
// Tienen libre albedrío: si hace mucho que no revisan, deciden ponerse a trabajar solos, y si lo que
// encuentran toca el trabajo de otro, arman un equipo, lo llaman y se juntan en una sala.

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const ICONOS: Record<IdAgente, LucideIcon> = {
    reposicion: PackageSearch, ventas: TrendingUp, catalogo: LayoutGrid, logs: FileSearch, marketing: Megaphone,
    costos: Calculator, revendedores: Handshake, compras: ShoppingCart, tendencias: Activity, experiencia: MousePointerClick,
};
const nombreDe = (id: IdAgente) => AGENTES.find(a => a.id === id)!.nombre;
const colorDe = (id: IdAgente) => AGENTES.find(a => a.id === id)!.color;
/** Si la última revisión es más vieja que esto, el agente decide solo volver a revisar */
const HORAS_PARA_REVISAR_SOLO = 12;
/** Un compañero llamado a un equipo vuelve a revisar si lo suyo tiene más de esto */
const MIN_DATOS_FRESCOS = 30;
const edadMs = (r: ResultadoAgente | undefined) => (r ? Date.now() - new Date(r.ejecutadoEn).getTime() : Infinity);

// El agente de Logs trabaja acá, en el navegador: los registros del sistema se guardan en cada compu
async function revisarLogs() {
    let logs: RegistroLog[] = [];
    try {
        const crudo = JSON.parse(localStorage.getItem("system_logs") || "[]");
        if (Array.isArray(crudo)) logs = crudo.filter(l => l && typeof l.message === "string");
    } catch { /* registros rotos o navegador sin acceso: se revisa como vacío */ }
    const inicio = Date.now();
    return guardarRevisionNavegador(agenteLogs(logs), Date.now() - inicio);
}

// El de Experiencia de usuario también trabaja acá: prueba las páginas y las fotos como un usuario
async function revisarExperiencia() {
    const inicio = Date.now();
    const fotos = await fotosCatalogo();
    if (!fotos.ok) return fotos;
    return guardarRevisionNavegador(await agenteExperiencia(fotos.dato), Date.now() - inicio);
}

const trabajar = (id: IdAgente) =>
    id === "logs" ? revisarLogs() : id === "experiencia" ? revisarExperiencia() : ejecutarAgente(id);

const NIVELES: Record<Hallazgo["nivel"], { etiqueta: string; Icono: LucideIcon; barra: string; texto: string; fondo: string }> = {
    urgente: { etiqueta: "Urgente", Icono: AlertTriangle, barra: "bg-[#C9866F]", texto: "text-[#97604D] dark:text-[#DBA793]", fondo: "bg-[#C9866F]/12" },
    atencion: { etiqueta: "Para mirar", Icono: Eye, barra: "bg-[#C9A877]", texto: "text-[#7A5C34] dark:text-[#DAC4AA]", fondo: "bg-[#C9A877]/15" },
    bien: { etiqueta: "En orden", Icono: CheckCircle2, barra: "bg-[#1baf7a]", texto: "text-[#128a5f] dark:text-[#4fd1a0]", fondo: "bg-[#1baf7a]/10" },
    dato: { etiqueta: "Para saber", Icono: Info, barra: "bg-[#7D9878]/60", texto: "text-[#5A7356] dark:text-[#A3B69B]", fondo: "bg-[#7D9878]/10" },
};

const TONOS: Record<NonNullable<Metrica["tono"]>, string> = {
    salvia: "text-[#3F5A3C] dark:text-[#C5D6BF]",
    terracota: "text-[#97604D] dark:text-[#DBA793]",
    arena: "text-[#7A5C34] dark:text-[#DAC4AA]",
    neutro: "text-[#2C2C2C] dark:text-[#F4EFEA]",
};


function haceCuanto(iso: string) {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (min < 1) return "recién";
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
    const d = Math.round(h / 24);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

const contar = (r: ResultadoAgente | undefined, nivel: Hallazgo["nivel"]) => r?.hallazgos.filter(h => h.nivel === nivel).length ?? 0;

export default function AgentesPage() {
    const [ultimos, setUltimos] = useState<Partial<Record<IdAgente, ResultadoAgente>>>({});
    const [iaConectada, setIaConectada] = useState(false);
    const [trabajando, setTrabajando] = useState<Set<IdAgente>>(new Set());
    // Agente cuya ventana está abierta (al tocar su personita)
    const [abierto, setAbierto] = useState<IdAgente | null>(null);
    // Ventana con las propuestas de mejora de todas las áreas juntas
    const [verPropuestas, setVerPropuestas] = useState(false);
    // Para la bitácora: el agente cuya revisión se acaba de terminar (sus pasos aparecen de a uno)
    const [recienTermino, setRecienTermino] = useState<IdAgente | null>(null);
    // Reuniones de equipo en curso (se ven en la oficina: se juntan y se sientan en una sala)
    const [reuniones, setReuniones] = useState<Reunion[]>([]);
    const [cargado, setCargado] = useState(false);
    const [instagramConectado, setInstagramConectado] = useState(false);
    const montado = useRef(true);
    const ultimosRef = useRef(ultimos);
    useEffect(() => { ultimosRef.current = ultimos; }, [ultimos]);
    const reunionesRef = useRef(reuniones);
    useEffect(() => { reunionesRef.current = reuniones; }, [reuniones]);
    // Trabajo en curso de cada agente (para que un equipo pueda esperar a sus compañeros)
    const enCurso = useRef<Partial<Record<IdAgente, Promise<ResultadoAgente | null>>>>({});
    // Equipos ya armados en esta visita (para no repetir la misma reunión cada vez que revisan)
    const equiposHechos = useRef<Set<string>>(new Set());

    useEffect(() => {
        montado.current = true;
        // Si se llega con ?agente=logs (por ejemplo desde la vieja página de logs), se abre ese
        const pedido = new URLSearchParams(window.location.search).get("agente");
        if (pedido && AGENTES.some(a => a.id === pedido)) setAbierto(pedido as IdAgente);
        estadoAgentes().then(r => {
            if (!montado.current) return;
            if (r.ok) {
                setUltimos(r.dato.ultimos);
                ultimosRef.current = r.dato.ultimos;
                setIaConectada(r.dato.iaConectada);
                setInstagramConectado(r.dato.instagramConectado);
                setCargado(true);
            } else toast.error(r.error);
        });
        return () => { montado.current = false; };
    }, []);

    // Pone a trabajar a un agente. Si ya está trabajando devuelve ese mismo trabajo.
    // llamadoPor: lo llamó un compañero para un equipo (no avisa por separado ni arma otro equipo)
    const poner = (id: IdAgente, llamadoPor?: IdAgente): Promise<ResultadoAgente | null> => {
        const ya = enCurso.current[id];
        if (ya) return ya;
        const trabajo = (async () => {
            setTrabajando(s => new Set(s).add(id));
            setRecienTermino(null);
            // Un mínimo de tiempo para que se lo vea recorrer la oficina aunque los datos lleguen enseguida
            const [r] = await Promise.all([trabajar(id), new Promise(res => setTimeout(res, MS_RECORRIDO + 300))]);
            if (!montado.current) return null;
            setTrabajando(s => { const n = new Set(s); n.delete(id); return n; });
            if (!r.ok) {
                toast.error(r.error);
                return null;
            }
            setUltimos(u => ({ ...u, [id]: r.dato }));
            ultimosRef.current = { ...ultimosRef.current, [id]: r.dato };
            setRecienTermino(id);
            if (!llamadoPor) {
                const urgentes = contar(r.dato, "urgente");
                toast.success(`${nombreDe(id)} terminó`, {
                    description: urgentes ? `Encontró ${urgentes} ${urgentes === 1 ? "cosa urgente" : "cosas urgentes"}. Tocalo para ver qué.` : "No encontró nada urgente.",
                });
                if (r.dato.equipo) void armarEquipo(id, r.dato.equipo);
            }
            return r.dato;
        })();
        enCurso.current[id] = trabajo;
        void trabajo.finally(() => { delete enCurso.current[id]; });
        return trabajo;
    };

    // Un agente decidió armar un equipo: llama a sus compañeros (si lo suyo es viejo, revisan antes),
    // y se juntan en una sala libre a sacar una propuesta en conjunto
    const armarEquipo = async (quien: IdAgente, equipo: Equipo) => {
        const clave = `${quien}:${equipo.motivo}`;
        if (equiposHechos.current.has(clave)) return;
        equiposHechos.current.add(clave);
        const con = equipo.con.filter(c => c !== quien);
        toast(`${nombreDe(quien)} armó un equipo con ${con.map(nombreDe).join(" y ")}`, {
            description: equipo.motivo,
            icon: <Users className="w-4 h-4" />,
        });
        await Promise.all(con.map(c => enCurso.current[c]
            ?? (edadMs(ultimosRef.current[c]) > MIN_DATOS_FRESCOS * 60_000 ? poner(c, quien) : Promise.resolve(null))));
        if (!montado.current) return;
        const ocupadas = new Set(reunionesRef.current.map(r => r.sala));
        const sala: SalaEquipo | null = !ocupadas.has("equipo") ? "equipo" : !ocupadas.has("chica") ? "chica" : null;
        if (!sala) return;
        const reunion: Reunion = { id: `${clave}-${Date.now()}`, sala, integrantes: [quien, ...con], motivo: equipo.motivo };
        reunionesRef.current = [...reunionesRef.current, reunion];
        setReuniones(rs => [...rs, reunion]);
        setTimeout(() => {
            if (montado.current) setReuniones(rs => rs.filter(r => r.id !== reunion.id));
        }, MS_REUNION);
    };

    // Libre albedrío: al entrar, los que hace mucho que no revisan deciden ponerse a trabajar solos (de a uno)
    useEffect(() => {
        if (!cargado) return;
        const viejos = AGENTES.filter(a => edadMs(ultimosRef.current[a.id]) > HORAS_PARA_REVISAR_SOLO * 3_600_000);
        const timers = viejos.map((a, i) => setTimeout(() => {
            if (!montado.current || enCurso.current[a.id]) return;
            const u = ultimosRef.current[a.id];
            toast(`${a.nombre} decidió ponerse a trabajar`, {
                description: u ? `Su última revisión era de ${haceCuanto(u.ejecutadoEn)}.` : "Todavía no había revisado nada.",
                icon: <Bot className="w-4 h-4" />,
            });
            void poner(a.id);
        }, 12_000 + i * 9_000));
        return () => timers.forEach(clearTimeout);
    }, [cargado]);  

    // Todos a la vez: cada uno sale a recorrer sus sectores
    const ponerTodos = () => { AGENTES.forEach(a => { void poner(a.id); }); };

    const agente = abierto ? AGENTES.find(a => a.id === abierto)! : null;
    const resultado = abierto ? ultimos[abierto] : undefined;
    const estaTrabajando = !!abierto && trabajando.has(abierto);
    const Icono = abierto ? ICONOS[abierto] : Bot;

    return (
        <div className="space-y-6 pb-12">
            <EncabezadoPagina icono={Bot} titulo="Agentes" descripcion="Tocá a un agente para ver qué encontró o ponelo a trabajar.">
                <span
                    title={iaConectada ? "Los agentes además escriben un resumen con IA" : "Funcionan igual; con la IA conectada además te explican lo encontrado con sus palabras"}
                    className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-semibold whitespace-nowrap ${iaConectada
                        ? "border-[#1baf7a]/40 bg-[#1baf7a]/10 text-[#128a5f] dark:text-[#4fd1a0]"
                        : "border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55"}`}
                >
                    {iaConectada ? <Sparkles className="w-4 h-4" /> : <PlugZap className="w-4 h-4" />}
                    {iaConectada ? "IA conectada" : "IA sin conectar"}
                </span>
                <button type="button" onClick={() => setVerPropuestas(true)} className={BOTON_ENC}>
                    <Lightbulb className="w-4 h-4" />
                    Propuestas de mejora
                </button>
                <button type="button" onClick={ponerTodos} disabled={trabajando.size > 0} className={BOTON_ENC}>
                    {trabajando.size > 0 ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {trabajando.size > 0 ? "Trabajando…" : "Poner a trabajar a todos"}
                </button>
            </EncabezadoPagina>

            {/* La oficina: cada agente camina por los sectores que está revisando */}
            <div className="anim-entrada [animation-delay:60ms]">
                <Oficina3D trabajando={trabajando} reuniones={reuniones} ultimos={ultimos} elegido={abierto} onElegir={setAbierto} />
            </div>

            {/* Ventana del agente: qué hace, qué encontró y el botón para ponerlo a trabajar */}
            <Ventana abierta={!!agente} onCerrar={() => setAbierto(null)} etiqueta={agente ? `Agente ${agente.nombre}` : "Agente"}>
                {agente && (
                    <PanelVentana ancho="xl" alto="pantalla">
                        <div className="px-6 md:px-7 pt-6 pb-5 border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 flex items-start justify-between gap-4 shrink-0">
                            <div className="flex items-start gap-4 min-w-0">
                                <span className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white" style={{ background: agente.color, boxShadow: `0 10px 24px -10px ${agente.color}` }}>
                                    <Icono className="w-5 h-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="font-brand text-2xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA]">{agente.nombre}</h2>
                                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{agente.descripcion}</p>
                                    {resultado && !estaTrabajando && (
                                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                            <Clock className="w-3.5 h-3.5" /> Revisó {haceCuanto(resultado.ejecutadoEn)} · tardó {(resultado.duracionMs / 1000).toFixed(1)} s
                                        </p>
                                    )}
                                </div>
                            </div>
                            <BotonCerrar onClick={() => setAbierto(null)} />
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-7 grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-6">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 mb-3">Bitácora</p>
                                <Bitacora
                                    key={`${agente.id}-${estaTrabajando ? "trabajando" : resultado?.ejecutadoEn ?? "nada"}`}
                                    pasos={estaTrabajando ? PLAN[agente.id] : resultado?.pasos ?? []}
                                    trabajando={estaTrabajando}
                                    animar={estaTrabajando || recienTermino === agente.id}
                                />
                                <Asistentes lider={agente.id} r={resultado} trabajando={estaTrabajando} />
                                {agente.id === "marketing" && <Instagram conectado={instagramConectado} />}
                            </div>
                            <div className="min-w-0 space-y-5">
                                {estaTrabajando ? (
                                    <div className="h-full min-h-48 rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] flex flex-col items-center justify-center gap-2 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                        <LoaderCircle className="w-5 h-5 animate-spin text-[#7D9878]" />
                                        {agente.nombre} está revisando tus datos…
                                    </div>
                                ) : !resultado ? (
                                    <div className="h-full min-h-48 rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] flex items-center justify-center text-center p-6 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                        Este agente todavía no trabajó. Ponelo a trabajar para ver qué encuentra.
                                    </div>
                                ) : (
                                    <Resultado r={resultado} iaConectada={iaConectada} animar={recienTermino === agente.id} />
                                )}
                            </div>
                        </div>

                        <PieVentana>
                            <button type="button" onClick={() => setAbierto(null)} className={BOTON_SECUNDARIO}>Cerrar</button>
                            <button type="button" onClick={() => poner(agente.id)} disabled={estaTrabajando} className={BOTON_PRINCIPAL}>
                                {estaTrabajando ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {estaTrabajando ? "Trabajando…" : resultado ? "Volver a revisar" : "Poner a trabajar"}
                            </button>
                        </PieVentana>
                    </PanelVentana>
                )}
            </Ventana>

            {/* Propuestas de mejora de todas las áreas, una sección por agente */}
            <Ventana abierta={verPropuestas} onCerrar={() => setVerPropuestas(false)} etiqueta="Propuestas de mejora">
                <PanelVentana ancho="xl" alto="pantalla">
                    <div className="px-6 md:px-7 pt-6 pb-5 border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 flex items-start justify-between gap-4 shrink-0">
                        <div className="flex items-start gap-4 min-w-0">
                            <span className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A]">
                                <Lightbulb className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 className="font-brand text-2xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA]">Propuestas de mejora</h2>
                                <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Lo que propone cada área según su última revisión, de lo más importante a lo menos.</p>
                            </div>
                        </div>
                        <BotonCerrar onClick={() => setVerPropuestas(false)} />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-7 space-y-7">
                        {AGENTES.map(a => {
                            const r = ultimos[a.id];
                            const Ic = ICONOS[a.id];
                            return (
                                <section key={a.id}>
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <h3 className="flex items-center gap-2.5 font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: a.color }}><Ic className="w-4 h-4" /></span>
                                            {a.nombre}
                                        </h3>
                                        {r && <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Revisó {haceCuanto(r.ejecutadoEn)}</span>}
                                    </div>
                                    {r?.propuestas?.length ? (
                                        <ListaPropuestas propuestas={r.propuestas} />
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                            {trabajando.has(a.id) ? "Está trabajando: en un momento trae sus propuestas." : "Todavía no armó propuestas. Ponelo a trabajar para que las prepare."}
                                            {!trabajando.has(a.id) && (
                                                <button type="button" onClick={() => void poner(a.id)} className={BOTON_SECUNDARIO}>
                                                    <Play className="w-4 h-4" /> Poner a trabajar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                </PanelVentana>
            </Ventana>
        </div>
    );
}

// Pasos del agente: mientras trabaja, el último gira; al terminar aparecen de a uno con su tilde
function Bitacora({ pasos, trabajando, animar }: { pasos: string[]; trabajando: boolean; animar: boolean }) {
    const [visibles, setVisibles] = useState(animar ? 0 : pasos.length);
    useEffect(() => {
        if (!animar) return;
        if (visibles >= pasos.length) return;
        // Mientras trabaja, un paso por sector de la oficina; al terminar, los pasos reales aparecen rápido
        const t = setTimeout(() => setVisibles(v => v + 1), trabajando ? (visibles === 0 ? 0 : MS_POR_PASO) : 160);
        return () => clearTimeout(t);
    }, [visibles, pasos.length, animar, trabajando]);

    if (pasos.length === 0) {
        return <p className="text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">Acá vas a ver paso a paso lo que hace el agente.</p>;
    }
    return (
        <ol className="relative space-y-3 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-[#E6DFD5] dark:before:bg-[#353B33]">
            <AnimatePresence initial={false}>
                {pasos.slice(0, visibles).map((p, i) => {
                    const enCurso = trabajando && i === visibles - 1;
                    return (
                        <motion.li
                            key={`${i}-${p}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
                            className="relative flex items-start gap-3 text-sm"
                        >
                            <span className={`relative z-10 mt-0.5 w-[23px] h-[23px] shrink-0 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#242723] ${enCurso
                                ? "bg-[#7D9878]/15 text-[#5A7356] dark:text-[#A3B69B]"
                                : "bg-[#7D9878] text-white"}`}>
                                {enCurso ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                            <span className={`leading-snug ${enCurso ? "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55" : "text-[#2C2C2C]/85 dark:text-[#F4EFEA]/85"}`}>{p}</span>
                        </motion.li>
                    );
                })}
            </AnimatePresence>
        </ol>
    );
}

const IMPACTO: Record<Propuesta["impacto"], { etiqueta: string; clase: string }> = {
    alto: { etiqueta: "Impacto alto", clase: "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]" },
    medio: { etiqueta: "Impacto medio", clase: "bg-[#C9A877]/15 text-[#7A5C34] dark:text-[#DAC4AA]" },
    bajo: { etiqueta: "Impacto bajo", clase: "bg-[#7D9878]/12 text-[#5A7356] dark:text-[#A3B69B]" },
};

// Propuestas numeradas: qué hacer, por qué y a dónde ir para hacerlo
function ListaPropuestas({ propuestas }: { propuestas: Propuesta[] }) {
    return (
        <ol className="space-y-2.5">
            {propuestas.map((p, i) => (
                <li key={`${i}-${p.titulo}`} className="flex gap-3 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-white/[0.02] px-4 py-3">
                    <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] text-xs font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] leading-snug">{p.titulo}</h3>
                            <span className={`shrink-0 inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold ${IMPACTO[p.impacto].clase}`}>{IMPACTO[p.impacto].etiqueta}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{p.porque}</p>
                        {p.accion && (
                            <Link href={p.accion.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5A7356] dark:text-[#A3B69B] [@media(hover:hover)]:hover:underline">
                                {p.accion.texto} <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}

// Los dos asistentes (mini IA) del líder: qué hace cada uno y qué hizo en la última revisión
function Asistentes({ lider, r, trabajando }: { lider: IdAgente; r: ResultadoAgente | undefined; trabajando: boolean }) {
    return (
        <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 mb-3">Sus asistentes (mini IA)</p>
            <ul className="space-y-2">
                {ASISTENTES[lider].map((a, i) => {
                    const hizo = r?.asistentes?.[i]?.hizo;
                    return (
                        <li key={a.nombre} className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] px-3 py-2.5">
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                <span aria-hidden className="w-2 h-2 rotate-45 rounded-[1px]" style={{ background: colorDe(lider) }} />
                                {a.nombre}
                                {trabajando && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#7D9878]" />}
                            </p>
                            <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{a.tarea}</p>
                            {hizo && !trabajando && <p className="mt-1 text-xs text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">{hizo}</p>}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// Estado de la conexión con Instagram (para el agente de Marketing)
function Instagram({ conectado }: { conectado: boolean }) {
    return (
        <div className="mt-6 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] px-3 py-3">
            <p className="flex items-center justify-between gap-2 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                Instagram
                <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-semibold ${conectado
                    ? "bg-[#1baf7a]/10 text-[#128a5f] dark:text-[#4fd1a0]"
                    : "bg-[#C9A877]/15 text-[#7A5C34] dark:text-[#DAC4AA]"}`}>
                    {conectado ? <Check className="w-3 h-3" /> : <PlugZap className="w-3 h-3" />}
                    {conectado ? "Conectado" : "Sin conectar"}
                </span>
            </p>
            <p className="mt-1 text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                {conectado
                    ? "Marketing mira tus seguidores y qué publicaciones funcionaron mejor."
                    : "Cuando lo conectes, Marketing va a mirar tus seguidores, qué publicaciones funcionan mejor y cuánto hace que no publicás."}
            </p>
        </div>
    );
}

// Equipo: con quiénes se juntó, por qué y qué proponen entre todos
function TarjetaEquipo({ quien, equipo, entrada }: { quien: IdAgente; equipo: Equipo; entrada: object }) {
    const integrantes = [quien, ...equipo.con.filter(c => c !== quien)];
    return (
        <motion.div {...entrada} className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-gradient-to-br from-[#F9F6F0] to-white dark:from-[#1B1D1A] dark:to-[#242723] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A7356] dark:text-[#A3B69B]">
                    <Users className="w-3.5 h-3.5" /> Armó un equipo
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {integrantes.map(id => (
                        <span key={id} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-white dark:bg-white/[0.04] border border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: colorDe(id) }} />
                            {nombreDe(id)}
                        </span>
                    ))}
                </div>
            </div>
            <h3 className="mt-2 font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{equipo.motivo}</h3>
            <p className="mt-1 text-sm text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65"><span className="font-semibold text-[#2C2C2C]/85 dark:text-[#F4EFEA]/85">Propuesta del equipo: </span>{equipo.propuesta}</p>
        </motion.div>
    );
}

function Resultado({ r, iaConectada, animar }: { r: ResultadoAgente; iaConectada: boolean; animar: boolean }) {
    const entrada = (i: number) => (animar
        ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.05, duration: 0.3, ease: EASE_OUT } } }
        : {});
    return (
        <>
            {/* Resumen de la IA */}
            {r.resumenIA ? (
                <motion.div {...entrada(0)} className="relative pl-4">
                    <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-[#A3B69B] to-[#C9A877]" />
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A7356] dark:text-[#A3B69B] mb-1">
                        <Sparkles className="w-3.5 h-3.5" /> En pocas palabras
                    </p>
                    <p className="font-editorial text-[1.2rem] leading-snug font-semibold italic text-[#2C2C2C] dark:text-[#F4EFEA] whitespace-pre-line">{r.resumenIA}</p>
                </motion.div>
            ) : !iaConectada ? (
                <motion.p {...entrada(0)} className="inline-flex items-center gap-2 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                    <PlugZap className="w-3.5 h-3.5" /> Con la IA conectada, acá además te lo explicaría con sus palabras.
                </motion.p>
            ) : null}

            {/* Propuestas de mejora para su área */}
            {r.propuestas && r.propuestas.length > 0 && (
                <motion.div {...entrada(1)}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 mb-3">Propuestas de mejora</p>
                    <ListaPropuestas propuestas={r.propuestas} />
                </motion.div>
            )}

            {/* Equipo que armó por su cuenta */}
            {r.equipo && <TarjetaEquipo quien={r.agente} equipo={r.equipo} entrada={entrada(1)} />}

            {/* Números */}
            <motion.div {...entrada(1)} className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {r.metricas.map(m => (
                    <div key={m.etiqueta} className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{m.etiqueta}</p>
                        <p className={`mt-1 text-2xl font-black tracking-tight tabular-nums ${TONOS[m.tono ?? "neutro"]}`}>{m.valor}</p>
                        {m.detalle && <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{m.detalle}</p>}
                    </div>
                ))}
            </motion.div>

            {/* Hallazgos */}
            <div className="space-y-3">
                {r.hallazgos.map((h, i) => {
                    const n = NIVELES[h.nivel];
                    return (
                        <motion.article
                            key={`${h.titulo}-${i}`}
                            {...entrada(2 + i)}
                            className="relative overflow-hidden rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-white/[0.02] pl-5 pr-4 py-4"
                        >
                            <span aria-hidden className={`absolute left-0 inset-y-0 w-1 ${n.barra}`} />
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-semibold ${n.fondo} ${n.texto}`}>
                                        <n.Icono className="w-3.5 h-3.5" /> {n.etiqueta}
                                    </span>
                                    <h3 className="mt-2 font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{h.titulo}</h3>
                                    {h.detalle && <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">{h.detalle}</p>}
                                </div>
                                {h.accion && (
                                    <Link
                                        href={h.accion.href}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E6DFD5] dark:border-[#3A403A] text-xs font-semibold text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80 [@media(hover:hover)]:hover:border-[#7D9878]/60 [@media(hover:hover)]:hover:text-[#2C2C2C] dark:[@media(hover:hover)]:hover:text-[#F4EFEA] active:scale-[0.97] transition-[border-color,color,transform] duration-150 whitespace-nowrap"
                                    >
                                        {h.accion.texto} <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                            </div>
                            {h.items && h.items.length > 0 && (
                                <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                                    {h.items.map(it => (
                                        <li key={it} className="flex items-start gap-2 text-sm text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75">
                                            <span aria-hidden className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${n.barra}`} />
                                            <span className="min-w-0">{it}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </motion.article>
                    );
                })}
            </div>
        </>
    );
}
