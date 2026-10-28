"use client";

import { useEffect, useMemo, useState } from "react";
import { Droplet, Flower2, LoaderCircle, Sparkles, Wind } from "lucide-react";
import { toast } from "sonner";
import Ventana from "@/components/Ventana";
import {
    PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TituloGrupo, FilaInterruptor,
    CAMPO, AREA_TEXTO, ETIQUETA_CAMPO, AYUDA_CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO, opcion,
} from "@/components/ventana-partes";
import { ACORDES, calcularAcordes, colorAcorde, type Acorde, type NotasPerfume } from "@/lib/catalogo-perfume";
import { guardarNotasPerfume } from "@/lib/perfume-notas-actions";

// Ventana del admin para ver y editar las notas de un perfume: familia, descripción,
// notas de salida, corazón y fondo, y las barras de "lo que predomina" que ve el cliente.
// Las barras se calculan solas de las notas; si hace falta, se pueden ajustar a mano.

const FAMILIAS = ["Floral", "Dulce", "Frutal", "Cítrico", "Amaderado", "Especiado", "Aromático", "Fougère", "Acuático", "Oriental", "Almizclado", "Cuero", "Verde", "Chipre"];
const MAX_FAMILIAS = 3;

const NIVELES = [
    { campo: "salida", titulo: "Salida", ayuda: "Lo primero que se siente", Icono: Wind, ejemplo: "Bergamota, frambuesa, limón" },
    { campo: "corazon", titulo: "Corazón", ayuda: "El centro del perfume", Icono: Flower2, ejemplo: "Jazmín, rosa, flor de azahar" },
    { campo: "fondo", titulo: "Fondo", ayuda: "Lo que queda en la piel", Icono: Droplet, ejemplo: "Vainilla, pachulí, ámbar" },
] as const;

const VACIAS: NotasPerfume = { familia: [], salida: "", corazon: "", fondo: "", descripcion: "", acordes: null };

export default function EditorNotasPerfume({ abierto, slug, nombre, notas, onCerrar, onGuardado }: {
    abierto: boolean;
    slug: string | null;
    /** Nombre del perfume para el título */
    nombre: string;
    notas?: NotasPerfume;
    onCerrar: () => void;
    onGuardado: (slug: string, notas: NotasPerfume) => void;
}) {
    const [datos, setDatos] = useState<NotasPerfume>(VACIAS);
    const [aMano, setAMano] = useState(false);
    const [manuales, setManuales] = useState<Record<string, number>>({});
    const [guardando, setGuardando] = useState(false);

    // Al abrir, arranca con lo que tiene cargado el perfume
    useEffect(() => {
        if (!abierto) return;
        const n = notas ?? VACIAS;
        setDatos({ ...VACIAS, ...n, familia: [...(n.familia ?? [])] });
        const tieneManuales = !!(n.acordes && n.acordes.length > 0);
        setAMano(tieneManuales);
        setManuales(Object.fromEntries((tieneManuales ? n.acordes! : calcularAcordes(n, 12)).map(a => [a.nombre, a.valor])));
    }, [abierto, slug]);

    const calculados = useMemo(() => calcularAcordes(datos), [datos]);
    const vista: Acorde[] = aMano
        ? Object.entries(manuales).filter(([, v]) => v > 0).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor).slice(0, 5)
        : calculados;

    const cambiar = (campo: keyof NotasPerfume, valor: string) => setDatos(d => ({ ...d, [campo]: valor }));
    const alternarFamilia = (f: string) => setDatos(d => {
        if (d.familia.includes(f)) return { ...d, familia: d.familia.filter(x => x !== f) };
        if (d.familia.length >= MAX_FAMILIAS) {
            toast.info(`Hasta ${MAX_FAMILIAS} familias`, { description: "Sacá una para elegir otra." });
            return d;
        }
        return { ...d, familia: [...d.familia, f] };
    });
    const pasarAMano = (si: boolean) => {
        // Al ajustar a mano se parte de lo calculado, así no hay que empezar de cero
        if (si) setManuales(Object.fromEntries(ACORDES.map(a => [a.nombre, calcularAcordes(datos, 12).find(c => c.nombre === a.nombre)?.valor ?? 0])));
        setAMano(si);
    };

    const guardar = async () => {
        if (!slug || guardando) return;
        const final: NotasPerfume = {
            ...datos,
            acordes: aMano ? Object.entries(manuales).filter(([, v]) => v > 0).map(([nombre, valor]) => ({ nombre, valor })) : null,
        };
        setGuardando(true);
        const r = await guardarNotasPerfume(slug, final);
        setGuardando(false);
        if (r.error) {
            toast.error("No se pudieron guardar las notas", { description: r.error });
            return;
        }
        toast.success("Notas guardadas", { description: "Ya se ven en el catálogo." });
        onGuardado(slug, final);
        onCerrar();
    };

    return (
        <Ventana abierta={abierto} onCerrar={guardando ? undefined : onCerrar} cerrarAlTocarFondo={false} etiqueta={`Notas de ${nombre}`}>
            <PanelVentana ancho="lg" alto="pantalla">
                <CabeceraVentana
                    etiqueta="Notas del perfume"
                    titulo={nombre}
                    descripcion="Lo que ve el cliente al abrir el perfume en el catálogo."
                    icono={Sparkles}
                    onCerrar={onCerrar}
                    cerrarDeshabilitado={guardando}
                />
                <CuerpoVentana className="space-y-7">
                    <section>
                        <TituloGrupo derecha={<span className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">{datos.familia.length}/{MAX_FAMILIAS}</span>}>
                            Familia olfativa
                        </TituloGrupo>
                        <div className="flex flex-wrap gap-2">
                            {FAMILIAS.map(f => (
                                <button key={f} type="button" aria-pressed={datos.familia.includes(f)} onClick={() => alternarFamilia(f)} className={opcion(datos.familia.includes(f))}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <label htmlFor="desc-perfume" className={ETIQUETA_CAMPO}>Descripción</label>
                        <textarea
                            id="desc-perfume"
                            value={datos.descripcion}
                            onChange={e => cambiar("descripcion", e.target.value)}
                            maxLength={600}
                            placeholder="Ej.: Floral con frambuesa y miel: brillante y glamoroso."
                            className={AREA_TEXTO}
                        />
                        <p className={AYUDA_CAMPO}>Una o dos frases. Si el producto tiene una descripción propia, el catálogo muestra esa.</p>
                    </section>

                    <section>
                        <TituloGrupo>Notas</TituloGrupo>
                        <div className="space-y-3">
                            {NIVELES.map(n => (
                                <div key={n.campo}>
                                    <label htmlFor={`nota-${n.campo}`} className={`${ETIQUETA_CAMPO} flex items-center gap-2`}>
                                        <n.Icono className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                                        {n.titulo}
                                        <span className="font-normal text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">· {n.ayuda}</span>
                                    </label>
                                    <input
                                        id={`nota-${n.campo}`}
                                        value={datos[n.campo]}
                                        onChange={e => cambiar(n.campo, e.target.value)}
                                        maxLength={400}
                                        placeholder={n.ejemplo}
                                        className={CAMPO}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className={AYUDA_CAMPO}>Separalas con comas.</p>
                    </section>

                    <section className="space-y-3">
                        <TituloGrupo>Lo que predomina</TituloGrupo>
                        <FilaInterruptor
                            titulo="Ajustar a mano"
                            descripcion={aMano ? "Mové cada barra. Las que queden en 0 no se muestran." : "Se calcula solo a partir de las notas y la familia."}
                            activo={aMano}
                            onCambiar={pasarAMano}
                        />

                        {aMano ? (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
                                {ACORDES.map(a => (
                                    <label key={a.nombre} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                                        <span className="font-medium truncate">{a.nombre}</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={5}
                                            value={manuales[a.nombre] ?? 0}
                                            onChange={e => setManuales(m => ({ ...m, [a.nombre]: Number(e.target.value) }))}
                                            style={{ accentColor: a.color }}
                                            className="w-full cursor-pointer"
                                        />
                                        <span className="text-xs tabular-nums text-right text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{manuales[a.nombre] ?? 0}%</span>
                                    </label>
                                ))}
                            </div>
                        ) : null}

                        {/* Vista previa: así lo ve el cliente */}
                        <div className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 mb-3">Vista previa</p>
                            {vista.length > 0 ? (
                                <ul className="space-y-2">
                                    {vista.map(a => (
                                        <li key={a.nombre} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                                            <span className="text-[13px] font-semibold truncate">{a.nombre}</span>
                                            <span className="relative h-2.5 rounded-full bg-[#2C2C2C]/[0.07] dark:bg-white/[0.08] overflow-hidden">
                                                <span
                                                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
                                                    style={{ width: `${a.valor}%`, background: colorAcorde(a.nombre) }}
                                                />
                                            </span>
                                            <span className="text-xs tabular-nums text-right text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{a.valor}%</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Cargá notas o familia para ver las barras.</p>
                            )}
                        </div>
                    </section>
                </CuerpoVentana>
                <PieVentana>
                    <button type="button" onClick={onCerrar} disabled={guardando} className={BOTON_SECUNDARIO}>Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !slug} aria-busy={guardando} className={BOTON_PRINCIPAL}>
                        {guardando && <LoaderCircle className="w-4 h-4 animate-spin" />}
                        {guardando ? "Guardando…" : "Guardar notas"}
                    </button>
                </PieVentana>
            </PanelVentana>
        </Ventana>
    );
}
