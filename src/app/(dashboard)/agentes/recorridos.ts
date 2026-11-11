// Plano del piso de oficinas de los agentes: dónde está cada sala, por dónde se camina y qué
// recorrido hace cada agente mientras trabaja. Lo usan la oficina 3D y la página (para los tiempos).
//
// Las medidas están en "píxeles de plano": el piso mide 4160 × 1160 (100 = 1 metro, o sea 41,6 × 11,6 m).
// Arriba (contra los ventanales): sala de reuniones, 5 oficinas, servidores, una segunda sala de
// reuniones y 2 oficinas más. En el medio, un pasillo de 2 m (centro en y = 580). Abajo: sala de
// descanso, recepción, sala de equipo, 2 oficinas, archivo, baños y 2 oficinas más (una libre).
// Las oficinas de abajo son las mismas que las de arriba, dadas vuelta (la ventana queda adelante).
// Para ir de un lugar a otro se sale al pasillo por la puerta de cada sala, así nadie atraviesa
// paredes ni muebles.
import { AGENTES, type IdAgente } from "@/lib/agentes-tipos";

export type Punto = { x: number; y: number };
export type Sector = "reuniones" | "reuniones2" | "servidores" | "archivo" | "recepcion" | "descanso";
/** Salas donde se juntan los equipos (cada agente se sienta en una silla de la mesa) */
export type SalaEquipo = "equipo" | "chica";
export type Lugar = Sector | "escritorio" | `${SalaEquipo}:${number}` | `visita:${IdAgente}`;

export const ANCHO = 4160;
export const ALTO = 1160;
export const PASILLO_Y = 580;
/** Frente vidriado de las salas de arriba y frente de las salas de abajo */
export const FRENTE_ARRIBA = 480;
export const FRENTE_ABAJO = 680;
/** Fondo de las salas de arriba (ventanales) y de las de abajo (pared de adelante) */
export const FONDO_ARRIBA = 24;
export const FONDO_ABAJO = ALTO - 24;

/**
 * Hacia dónde mira cada uno cuando llega (radianes): 0 = hacia abajo del plano (hacia la cámara),
 * π = hacia los ventanales, π/2 = hacia la derecha, −π/2 = hacia la izquierda.
 */
export const SECTORES: Record<Sector, { nombre: string; punto: Punto; accesos: Punto[]; mira: number; solo?: boolean }> = {
    reuniones: { nombre: "Sala de reuniones", punto: { x: 300, y: 110 }, accesos: [{ x: 560, y: 110 }, { x: 560, y: PASILLO_Y }], mira: Math.PI },
    // Pizarra de la sala de reuniones 2 (la usan los agentes del lado derecho del piso)
    reuniones2: { nombre: "Sala de reuniones 2", punto: { x: 3110, y: 100 }, accesos: [{ x: 2900, y: 100 }, { x: 2900, y: PASILLO_Y }], mira: Math.PI },
    servidores: { nombre: "Servidores", punto: { x: 2680, y: 170 }, accesos: [{ x: 2680, y: PASILLO_Y }], mira: Math.PI, solo: true },
    archivo: { nombre: "Archivo", punto: { x: 2960, y: 1035 }, accesos: [{ x: 2960, y: PASILLO_Y }], mira: 0 },
    recepcion: { nombre: "Recepción", punto: { x: 1150, y: 1035 }, accesos: [{ x: 1150, y: PASILLO_Y }], mira: 0 },
    descanso: { nombre: "Sala de descanso", punto: { x: 150, y: 830 }, accesos: [{ x: 340, y: 760 }, { x: 340, y: PASILLO_Y }], mira: -Math.PI / 2 },
};

/** Oficina privada de cada agente, de 3,8 × 4,5 m. abajo = del lado de abajo del pasillo */
export const OFICINAS: Record<IdAgente, { x1: number; x2: number; abajo?: boolean }> = {
    reposicion: { x1: 620, x2: 1000 },
    ventas: { x1: 1000, x2: 1380 },
    catalogo: { x1: 1380, x2: 1760 },
    logs: { x1: 1760, x2: 2140 },
    marketing: { x1: 2140, x2: 2520 },
    costos: { x1: 3380, x2: 3760 },
    tendencias: { x1: 3760, x2: 4140 },
    compras: { x1: 2060, x2: 2440, abajo: true },
    revendedores: { x1: 2440, x2: 2820, abajo: true },
    experiencia: { x1: 3380, x2: 3760, abajo: true },
};
/** Oficinas libres (abajo), para cuando se sumen agentes */
export const OFICINAS_LIBRES: { x1: number; x2: number }[] = [{ x1: 3760, x2: 4140 }];

export const centroOficina = (id: IdAgente) => (OFICINAS[id].x1 + OFICINAS[id].x2) / 2;
/** El escritorio de cada oficina (centro); la silla queda detrás, del lado de la ventana */
export const Y_ESCRITORIO = 200;
export const Y_SILLA = 140;
/** La puerta de cada oficina de arriba está a la derecha del frente vidriado (en las de abajo, a la izquierda) */
export const puertaOficina = (id: IdAgente) => (OFICINAS[id].abajo ? OFICINAS[id].x1 + 48 : OFICINAS[id].x2 - 48);

/**
 * Las oficinas de abajo son las de arriba dadas vuelta sobre su centro: cada punto calculado como
 * si la oficina estuviera arriba se espeja, y quien mira hacia un lado pasa a mirar al opuesto.
 */
function espejar(id: IdAgente, d: Destino): Destino {
    const o = OFICINAS[id];
    if (!o.abajo) return d;
    const p = (q: Punto): Punto => ({ x: o.x1 + o.x2 - q.x, y: ALTO - q.y });
    return { punto: p(d.punto), accesos: d.accesos.map(q => (q.y === PASILLO_Y ? { x: o.x1 + o.x2 - q.x, y: PASILLO_Y } : p(q))), mira: d.mira + Math.PI, sentado: d.sentado };
}
/** Puerta de la oficina calculada como si estuviera arriba (para armar los caminos antes de espejar) */
const puertaArriba = (id: IdAgente) => OFICINAS[id].x2 - 48;
/** Donde se para quien viene de visita: al costado del escritorio, mirando al dueño de la oficina */
export const dxVisita = 65;
/** Puestos de los dos asistentes (mini IA) en cada oficina: escritorio chico contra el vidrio del frente */
export const DX_ASISTENTE = [110, 235] as const;
export const Y_MESA_ASISTENTE = 350;
export const Y_SILLA_ASISTENTE = 410;

/** Sillas de las salas de equipo: dónde se sienta cada integrante y por dónde llega desde el pasillo */
export const SALAS_EQUIPO: Record<SalaEquipo, { nombre: string; asientos: number[]; ySilla: number; yPaso: number; puerta: number }> = {
    // Sala de equipo (abajo): mesa larga, se sientan del lado del pasillo mirando a la cámara
    equipo: { nombre: "Sala de equipo", asientos: [1640, 1710, 1780, 1850, 1920], ySilla: 806, yPaso: 745, puerta: 2010 },
    // Sala de reuniones 2 (arriba a la derecha)
    chica: { nombre: "Sala de reuniones 2", asientos: [3010, 3080, 3150, 3220], ySilla: 176, yPaso: 118, puerta: 2900 },
};

// Para que no se encimen cuando dos van a la misma sala (se corren de costado)
const CORRIMIENTO: Record<IdAgente, number> = {
    reposicion: -55, ventas: 0, catalogo: 55, logs: -100, marketing: 100,
    costos: 28, revendedores: -28, compras: 78, tendencias: -78, experiencia: 125,
};

export type Destino = { punto: Punto; accesos: Punto[]; mira: number; sentado: boolean };

export function lugarDe(id: IdAgente, lugar: Lugar): Destino {
    if (lugar === "escritorio") {
        const cx = centroOficina(id);
        const puerta = puertaArriba(id);
        return espejar(id, { punto: { x: cx, y: Y_SILLA }, accesos: [{ x: puerta, y: Y_SILLA }, { x: puerta, y: PASILLO_Y }], mira: 0, sentado: true });
    }
    if (lugar.startsWith("visita:")) {
        // Se para al costado del escritorio del compañero, mirándolo
        const otro = lugar.slice(7) as IdAgente;
        const x = OFICINAS[otro].x1 + dxVisita;
        const puerta = puertaArriba(otro);
        return espejar(otro, { punto: { x, y: Y_ESCRITORIO }, accesos: [{ x, y: 258 }, { x: puerta, y: 258 }, { x: puerta, y: PASILLO_Y }], mira: Math.PI / 2, sentado: false });
    }
    if (lugar.startsWith("equipo:") || lugar.startsWith("chica:")) {
        const [sala, n] = lugar.split(":") as [SalaEquipo, string];
        const s = SALAS_EQUIPO[sala];
        const x = s.asientos[Number(n) % s.asientos.length];
        return {
            punto: { x, y: s.ySilla },
            accesos: [{ x, y: s.yPaso }, { x: s.puerta, y: s.yPaso }, { x: s.puerta, y: PASILLO_Y }],
            mira: 0,
            sentado: true,
        };
    }
    const s = SECTORES[lugar as Sector];
    const c = s.solo ? 0 : CORRIMIENTO[id];
    // De costado respecto de hacia dónde mira
    const punto = { x: Math.round(s.punto.x + c * Math.cos(s.mira)), y: Math.round(s.punto.y - c * Math.sin(s.mira)) };
    return { punto, accesos: s.accesos, mira: s.mira, sentado: false };
}

/** Puntos por los que camina para ir de un lugar a otro (sale al pasillo, lo recorre y entra) */
export function ruta(id: IdAgente, desde: Lugar, hasta: Lugar): Punto[] {
    const h = lugarDe(id, hasta);
    if (desde === hasta) {
        if (h.sentado) return [h.punto];
        // Misma sala dos veces seguidas: se corre un poco para mirar otra parte y vuelve
        return [{ x: h.punto.x + Math.round(45 * Math.cos(h.mira)), y: h.punto.y - Math.round(45 * Math.sin(h.mira)) }, h.punto];
    }
    return [...lugarDe(id, desde).accesos, ...[...h.accesos].reverse(), h.punto];
}

// ── Asistentes (mini IA) ─────────────────────────────────────────────────────

/** Una persona de la oficina: un agente líder o uno de sus dos asistentes ("ventas#0", "ventas#1") */
export type IdPersona = IdAgente | `${IdAgente}#${0 | 1}`;
export const esAsistente = (p: string) => p.includes("#");
export const liderDe = (p: string) => p.split("#")[0] as IdAgente;
export const ASISTENTES_DE = (id: IdAgente): IdPersona[] => [`${id}#0`, `${id}#1`];
/** Lugares de un asistente: su mesa, o una silla del lado de enfrente en una sala de equipo */
export type LugarAsistente = "mesa" | `${SalaEquipo}:${number}`;
/** Sillas de enfrente en cada sala de equipo (las usan los asistentes que vienen a la reunión) */
const SILLAS_ENFRENTE: Record<SalaEquipo, { asientos: number[]; ySilla: number; yPaso: number; puerta: number; yEntrada: number }> = {
    equipo: { asientos: [1640, 1710, 1780, 1850, 1920], ySilla: 944, yPaso: 1000, puerta: 2030, yEntrada: 745 },
    chica: { asientos: [3010, 3080, 3150, 3220], ySilla: 314, yPaso: 370, puerta: 2900, yEntrada: 370 },
};
export const capacidadEnfrente = (sala: SalaEquipo) => SILLAS_ENFRENTE[sala].asientos.length;

function lugarAsistente(p: IdPersona, lugar: LugarAsistente): Destino {
    const lider = liderDe(p);
    const n = Number(p.split("#")[1]) as 0 | 1;
    if (lugar === "mesa") {
        const x = OFICINAS[lider].x1 + DX_ASISTENTE[n];
        const puerta = puertaArriba(lider);
        return espejar(lider, { punto: { x, y: Y_SILLA_ASISTENTE }, accesos: [{ x, y: 445 }, { x: puerta, y: 445 }, { x: puerta, y: PASILLO_Y }], mira: Math.PI, sentado: true });
    }
    const [sala, k] = lugar.split(":") as [SalaEquipo, string];
    const s = SILLAS_ENFRENTE[sala];
    const x = s.asientos[Number(k) % s.asientos.length];
    return {
        punto: { x, y: s.ySilla },
        accesos: [{ x, y: s.yPaso }, { x: s.puerta, y: s.yPaso }, { x: s.puerta, y: s.yEntrada }, { x: s.puerta, y: PASILLO_Y }],
        mira: Math.PI,
        sentado: true,
    };
}

/** Destino de cualquier persona (líder o asistente) */
export function destinoDe(p: IdPersona, lugar: string): Destino {
    return esAsistente(p) ? lugarAsistente(p, lugar as LugarAsistente) : lugarDe(p as IdAgente, lugar as Lugar);
}

/** Camino de cualquier persona entre dos lugares */
export function rutaDe(p: IdPersona, desde: string, hasta: string): Punto[] {
    if (!esAsistente(p)) return ruta(p as IdAgente, desde as Lugar, hasta as Lugar);
    const h = destinoDe(p, hasta);
    if (desde === hasta) return [h.punto];
    return [...destinoDe(p, desde).accesos, ...[...h.accesos].reverse(), h.punto];
}

/** Recorrido de cada agente: una sala por paso de su trabajo (mismos textos que la bitácora) */
export const RECORRIDOS: Record<IdAgente, { sector: Sector; texto: string }[]> = {
    reposicion: [
        { sector: "archivo", texto: "Abriendo el inventario…" },
        { sector: "reuniones", texto: "Mirando las ventas recientes…" },
        { sector: "archivo", texto: "Cruzando stock con lo que se vende…" },
    ],
    ventas: [
        { sector: "archivo", texto: "Juntando las ventas…" },
        { sector: "reuniones", texto: "Comparando con el mes anterior…" },
        { sector: "reuniones", texto: "Calculando la ganancia…" },
    ],
    catalogo: [
        { sector: "recepcion", texto: "Recorriendo los productos publicados…" },
        { sector: "recepcion", texto: "Revisando fotos, precios y notas…" },
        { sector: "archivo", texto: "Comparando precios con costos…" },
    ],
    logs: [
        { sector: "servidores", texto: "Abriendo los registros…" },
        { sector: "servidores", texto: "Buscando errores repetidos…" },
        { sector: "reuniones", texto: "Contando la actividad por área…" },
    ],
    marketing: [
        { sector: "recepcion", texto: "Mirando qué se luce en el exhibidor…" },
        { sector: "reuniones", texto: "Viendo qué es lo que más se vende…" },
        { sector: "archivo", texto: "Buscando clientes para volver a escribirles…" },
    ],
    costos: [
        { sector: "archivo", texto: "Juntando los precios de esencias e insumos…" },
        { sector: "reuniones2", texto: "Recalculando costos con el dólar de hoy…" },
        { sector: "reuniones2", texto: "Comparando precios con márgenes…" },
    ],
    revendedores: [
        { sector: "archivo", texto: "Abriendo los pedidos mayoristas…" },
        { sector: "recepcion", texto: "Repasando la lista mayorista…" },
        { sector: "reuniones2", texto: "Viendo quién dejó de comprar…" },
    ],
    compras: [
        { sector: "archivo", texto: "Revisando qué falta…" },
        { sector: "archivo", texto: "Comparando proveedores…" },
        { sector: "reuniones2", texto: "Armando la lista de compras…" },
    ],
    tendencias: [
        { sector: "archivo", texto: "Repasando las ventas de los últimos meses…" },
        { sector: "reuniones2", texto: "Viendo qué viene creciendo…" },
        { sector: "reuniones2", texto: "Mirando qué aromas se eligen más…" },
    ],
    experiencia: [
        { sector: "servidores", texto: "Entrando a cada página…" },
        { sector: "servidores", texto: "Midiendo cuánto tarda cada una…" },
        { sector: "reuniones2", texto: "Revisando las fotos del catálogo…" },
    ],
};
/** Lo que dice cada uno mientras trabaja (para la bitácora de la página) */
export const PLAN: Record<IdAgente, string[]> = Object.fromEntries(
    AGENTES.map(a => [a.id, RECORRIDOS[a.id].map(p => p.texto)]),
) as Record<IdAgente, string[]>;

/** Cuánto dura cada paso: unos 4 s caminando (el piso es grande) y el resto revisando la sala */
export const MS_POR_PASO = 5200;
export const MS_RECORRIDO = MS_POR_PASO * 3;
/** Tiempo que intenta tardar en cada tramo (la velocidad se ajusta al largo del camino) */
export const SEGUNDOS_POR_TRAMO = 4;
/** Cuánto dura una reunión de equipo (sentados alrededor de la mesa) */
export const MS_REUNION = 14000;
