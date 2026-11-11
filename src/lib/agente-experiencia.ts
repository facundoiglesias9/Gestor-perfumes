// Agente de Experiencia de usuario: prueba la página como lo haría una persona.
// Trabaja en el navegador: entra a cada página (dos veces, y mide la segunda, que es la que vive
// un usuario normal), y descarga las fotos del catálogo para ver que carguen y no pesen de más.
// No cambia nada: solo mira y mide.
import { ASISTENTES, type Hallazgo, type Metrica, type Propuesta } from "./agentes-tipos";
import type { Parcial } from "./agentes";

/** Páginas que prueba: primero el catálogo, que es lo que ven los clientes */
const PAGINAS: { ruta: string; nombre: string; cliente?: boolean }[] = [
    { ruta: "/catalogo", nombre: "Catálogo", cliente: true },
    { ruta: "/resumen", nombre: "Resumen" },
    { ruta: "/lista-precios", nombre: "Lista de precios" },
    { ruta: "/caja", nombre: "Caja" },
    { ruta: "/inventario", nombre: "Inventario" },
    { ruta: "/mi-catalogo", nombre: "Mi catálogo" },
    { ruta: "/pedidos-solicitud", nombre: "Pedidos" },
    { ruta: "/esencias", nombre: "Esencias" },
    { ruta: "/insumos", nombre: "Insumos" },
];
const LENTA_MS = 2500;
const FOTO_LENTA_MS = 2000;
const FOTO_PESADA_KB = 400;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const lista = (xs: string[], n = 3) => xs.slice(0, n).join(", ");

async function medir(url: string) {
    const inicio = performance.now();
    try {
        const res = await fetch(url, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(20_000) });
        const cuerpo = await res.blob();
        return { ok: res.ok, estado: res.status, ms: performance.now() - inicio, kb: cuerpo.size / 1024 };
    } catch {
        return { ok: false, estado: 0, ms: performance.now() - inicio, kb: 0 };
    }
}

// De a pocas a la vez, para no saturar la conexión
async function enTandas<T, R>(xs: T[], tanda: number, fn: (x: T) => Promise<R>) {
    const r: R[] = [];
    for (let i = 0; i < xs.length; i += tanda) r.push(...await Promise.all(xs.slice(i, i + tanda).map(fn)));
    return r;
}

export async function agenteExperiencia(fotos: { nombre: string; url: string }[]): Promise<Parcial> {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];

    // 1. Páginas: una vuelta para "precalentar" y otra que es la que se mide
    await enTandas(PAGINAS, 3, p => medir(p.ruta));
    const paginas = await enTandas(PAGINAS, 3, async p => ({ ...p, ...(await medir(p.ruta)) }));
    const conError = paginas.filter(p => !p.ok);
    const lentas = paginas.filter(p => p.ok && p.ms > LENTA_MS).sort((a, b) => b.ms - a.ms);
    const promedio = paginas.filter(p => p.ok).reduce((a, p) => a + p.ms, 0) / Math.max(1, paginas.filter(p => p.ok).length);
    const catalogo = paginas.find(p => p.cliente);
    pasos.push(`Entré a ${plural(paginas.length, "página", "páginas")}: tardan ${segundos(promedio)} en promedio.`);

    if (conError.length > 0) {
        hallazgos.push({ nivel: "urgente", titulo: `${plural(conError.length, "página no abre", "páginas no abren")} bien`, items: conError.map(p => `${p.nombre} · ${p.estado ? `error ${p.estado}` : "no respondió"}`) });
    }
    if (lentas.length > 0) {
        hallazgos.push({ nivel: lentas.some(p => p.cliente) ? "urgente" : "atencion", titulo: `${plural(lentas.length, "página tarda", "páginas tardan")} en abrir`, detalle: `Más de ${segundos(LENTA_MS)}: la gente se aburre y se va.`, items: lentas.map(p => `${p.nombre} · ${segundos(p.ms)}`) });
    }

    // 2. Fotos del catálogo
    const revisadas = await enTandas(fotos, 6, async f => ({ ...f, ...(await medir(f.url)) }));
    const rotas = revisadas.filter(f => !f.ok);
    const pesadas = revisadas.filter(f => f.ok && f.kb > FOTO_PESADA_KB).sort((a, b) => b.kb - a.kb);
    const fotosLentas = revisadas.filter(f => f.ok && f.ms > FOTO_LENTA_MS);
    pasos.push(`Abrí ${plural(revisadas.length, "foto", "fotos")} del catálogo: ${plural(rotas.length, "no carga", "no cargan")} y ${plural(pesadas.length, "pesa", "pesan")} de más.`);
    if (rotas.length > 0) {
        hallazgos.push({ nivel: "urgente", titulo: `${plural(rotas.length, "foto no carga", "fotos no cargan")}`, detalle: "Tus clientes ven el producto sin foto.", items: rotas.slice(0, 5).map(f => f.nombre), accion: { texto: "Ir a Mi catálogo", href: "/mi-catalogo" } });
    }
    if (pesadas.length > 0) {
        hallazgos.push({ nivel: "atencion", titulo: `${plural(pesadas.length, "foto pesa", "fotos pesan")} de más`, detalle: `Más de ${FOTO_PESADA_KB} KB: en el celular con datos tardan en aparecer.`, items: pesadas.slice(0, 5).map(f => `${f.nombre} · ${Math.round(f.kb)} KB`) });
    }
    if (fotosLentas.length > 0) {
        hallazgos.push({ nivel: "dato", titulo: `${plural(fotosLentas.length, "foto tardó", "fotos tardaron")} más de ${segundos(FOTO_LENTA_MS)} en bajar` });
    }
    if (hallazgos.length === 0) {
        hallazgos.push({ nivel: "bien", titulo: "La página anda bien", detalle: "Todas las páginas abren rápido y las fotos cargan sin problemas." });
    }
    hallazgos.push({ nivel: "dato", titulo: "Cómo lo medí", detalle: "Entré dos veces a cada página y medí la segunda, como la vive alguien que ya la visitó. Mido desde esta compu: con otra conexión los tiempos cambian." });

    const propuestas: Propuesta[] = [];
    for (const p of conError) propuestas.push({ impacto: "alto", titulo: `Arreglar la página ${p.nombre}`, porque: `No abre (${p.estado ? `error ${p.estado}` : "no responde"}). Avisame y la reviso.` });
    if (catalogo && catalogo.ok && catalogo.ms > LENTA_MS) propuestas.push({ impacto: "alto", titulo: "Hacer que el catálogo cargue más rápido", porque: `Hoy tarda ${segundos(catalogo.ms)} y es lo primero que ven tus clientes.` });
    if (rotas.length > 0) propuestas.push({ impacto: "alto", titulo: `Volvé a subir la foto de ${lista(rotas.map(f => f.nombre))}`, porque: `${rotas.length === 1 ? "No carga" : "No cargan"}: el cliente ve el producto sin foto.`, accion: { texto: "Ir a Mi catálogo", href: "/mi-catalogo" } });
    if (pesadas.length > 0) propuestas.push({ impacto: "medio", titulo: `Achicá las fotos de ${lista(pesadas.map(f => f.nombre))}`, porque: `Pesan más de ${FOTO_PESADA_KB} KB: con datos móviles tardan en aparecer. Se pueden volver a subir más livianas.` });
    const lentasInternas = lentas.filter(p => !p.cliente);
    if (lentasInternas.length > 0) propuestas.push({ impacto: "medio", titulo: `Acelerar ${lista(lentasInternas.map(p => p.nombre))}`, porque: `Tardan más de ${segundos(LENTA_MS)} en abrir. Avisame y las optimizo.` });
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Probá el catálogo desde el celular de vez en cuando", porque: "Desde acá anda bien; en el celular es donde más lo usan tus clientes." });
    const peso = { alto: 0, medio: 1, bajo: 2 } as const;

    const metricas: Metrica[] = [
        { etiqueta: "Páginas probadas", valor: String(paginas.length), detalle: conError.length + lentas.length ? `${conError.length + lentas.length} con problemas` : "todas bien", tono: conError.length ? "terracota" : lentas.length ? "arena" : "salvia" },
        { etiqueta: "Tiempo promedio", valor: segundos(promedio), detalle: "en abrir cada página", tono: promedio > LENTA_MS ? "arena" : "salvia" },
        { etiqueta: "Catálogo", valor: catalogo?.ok ? segundos(catalogo.ms) : "Error", detalle: "lo que ven tus clientes", tono: !catalogo?.ok ? "terracota" : catalogo.ms > LENTA_MS ? "arena" : "salvia" },
        { etiqueta: "Fotos con problemas", valor: String(rotas.length + pesadas.length), detalle: `de ${revisadas.length} revisadas`, tono: rotas.length ? "terracota" : pesadas.length ? "arena" : "salvia" },
    ];
    pasos.push("Listo: te dejé qué mejorar para que la página se use mejor.");
    const PESO_NIVEL = { urgente: 0, atencion: 1, bien: 2, dato: 3 } as const;
    return {
        agente: "experiencia", pasos, metricas,
        hallazgos: [...hallazgos].sort((a, b) => PESO_NIVEL[a.nivel] - PESO_NIVEL[b.nivel]),
        equipo: rotas.length + pesadas.length > 0 ? {
            con: ["catalogo"],
            motivo: "Hay fotos del catálogo que no cargan o pesan de más",
            propuesta: `Catálogo vuelve a subir ${lista([...rotas, ...pesadas].map(f => f.nombre))} con fotos más livianas.`,
        } : null,
        propuestas: propuestas.sort((a, b) => peso[a.impacto] - peso[b.impacto]).slice(0, 4),
        asistentes: [
            { nombre: ASISTENTES.experiencia[0].nombre, hizo: `Probó ${paginas.length} páginas: ${conError.length} con error y ${lentas.length} lentas.` },
            { nombre: ASISTENTES.experiencia[1].nombre, hizo: `Abrió ${plural(revisadas.length, "foto", "fotos")}: ${plural(rotas.length, "rota", "rotas")} y ${plural(pesadas.length, "pesada", "pesadas")}.` },
        ],
    };
}
