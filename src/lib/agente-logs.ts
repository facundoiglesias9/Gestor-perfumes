// Agente de Logs: revisa los registros del sistema. Esos registros se guardan en el navegador de
// cada compu (los últimos 100, ver addSystemLog en AppContext), así que este agente trabaja en el
// navegador: la página /agentes le pasa los registros y después guarda la revisión en la base.
import { ASISTENTES, type Hallazgo, type Metrica, type Propuesta } from "./agentes-tipos";
import type { Parcial } from "./agentes";

export type RegistroLog = {
    id: string;
    ts?: number;
    timestamp?: string;
    type: "info" | "error" | "db" | "auth" | "warn";
    message: string;
};

const HORA = 3_600_000;
const DIA = 24 * HORA;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Fecha del registro: los nuevos guardan la hora exacta; los viejos solo el texto "dd/mm/aaaa, hh:mm:ss"
function fechaDe(l: RegistroLog): number | null {
    if (typeof l.ts === "number") return l.ts;
    const m = (l.timestamp ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] ?? 0)).getTime();
}

// Área del negocio de cada registro (el orden importa, igual que en la vieja página de logs)
const AREAS: [string, RegExp][] = [
    ["Dólar", /d[oó]lar|cotizaci/],
    ["Correo", /correo|mail|gmail/],
    ["Usuarios", /usuario|sesi[oó]n|login|ingres[oó] al sistema|contrase/],
    ["Stock", /stock|inventario|insumo|esencia|perfume hecho/],
    ["Pedidos", /pedido|proveedor/],
    ["Ventas", /venta|caja|cobr/],
    ["Catálogo", /cat[aá]logo|foto|producto|precio|nota/],
];
const areaDe = (m: string) => AREAS.find(([, re]) => re.test(m.toLowerCase()))?.[0] ?? "Sistema";

// Mensajes parecidos se agrupan: se sacan números y códigos para que "Error en pedido 123" y "… 456" sean uno
const clave = (m: string) => m.toLowerCase().replace(/[0-9a-f]{6,}|\d+/g, "#").replace(/\s+/g, " ").trim();

const cuando = (t: number, hoy: number) => {
    const h = Math.floor((hoy - t) / HORA);
    if (h < 1) return "hace un rato";
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} ${d === 1 ? "día" : "días"}`;
};

export function agenteLogs(logs: RegistroLog[], hoy = Date.now()): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const conFecha = logs.map(l => ({ ...l, t: fechaDe(l) }));
    pasos.push(`Abrí los registros guardados en esta compu: ${plural(logs.length, "registro", "registros")}.`);

    if (logs.length === 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: "No hay registros en esta compu",
            detalle: "Los registros se guardan en cada navegador. Si usás el sistema desde otra compu o el celular, revisalo desde ahí.",
        });
        pasos.push("Listo: no había nada para revisar.");
        return {
            agente: "logs", pasos, hallazgos,
            propuestas: [{ impacto: "bajo", titulo: "Revisá también desde las otras compus o el celular", porque: "Los registros se guardan en cada navegador y en esta compu no hay ninguno." }],
            asistentes: [
                { nombre: ASISTENTES.logs[0].nombre, hizo: "No encontró registros en esta compu." },
                { nombre: ASISTENTES.logs[1].nombre, hizo: "No hubo nada para investigar." },
            ],
            metricas: [
                { etiqueta: "Registros", valor: "0", tono: "neutro" },
                { etiqueta: "Errores (7 días)", valor: "0", tono: "neutro" },
                { etiqueta: "Avisos (7 días)", valor: "0", tono: "neutro" },
                { etiqueta: "Última actividad", valor: "—", tono: "neutro" },
            ],
        };
    }

    const semana = conFecha.filter(l => l.t === null || hoy - l.t <= 7 * DIA);
    const errores = semana.filter(l => l.type === "error");
    const avisos = semana.filter(l => l.type === "warn");
    const errores24 = errores.filter(l => l.t !== null && hoy - l.t <= DIA);
    pasos.push(`Separé los últimos 7 días: ${plural(errores.length, "error", "errores")} y ${plural(avisos.length, "aviso", "avisos")}.`);

    // 1. Errores, agrupados por mensaje (los repetidos primero)
    const grupos = new Map<string, { mensaje: string; veces: number; ultima: number | null }>();
    for (const e of errores) {
        const k = clave(e.message);
        const g = grupos.get(k) ?? { mensaje: e.message, veces: 0, ultima: null };
        g.veces++;
        if (e.t !== null && (g.ultima === null || e.t > g.ultima)) { g.ultima = e.t; g.mensaje = e.message; }
        grupos.set(k, g);
    }
    const repetidos = [...grupos.values()].sort((a, b) => b.veces - a.veces || (b.ultima ?? 0) - (a.ultima ?? 0));
    pasos.push(`Agrupé los errores parecidos: ${plural(repetidos.length, "tipo de error", "tipos de error distintos")}.`);
    if (repetidos.length > 0) {
        const seRepiten = repetidos.filter(g => g.veces > 1);
        hallazgos.push({
            nivel: errores24.length > 0 || seRepiten.length > 0 ? "urgente" : "atencion",
            titulo: errores24.length > 0
                ? `${plural(errores24.length, "error en las últimas 24 horas", "errores en las últimas 24 horas")}`
                : `${plural(errores.length, "error esta semana", "errores esta semana")}`,
            detalle: seRepiten.length > 0
                ? `${plural(seRepiten.length, "se repite", "se repiten")}: un error que vuelve a pasar suele ser algo que no anda.`
                : "Ninguno se repitió: pueden haber sido cortes momentáneos de internet.",
            items: repetidos.slice(0, 6).map(g => `${g.mensaje}${g.veces > 1 ? ` · ${g.veces} veces` : ""}${g.ultima ? ` · ${cuando(g.ultima, hoy)}` : ""}`),
        });
    }

    // 2. Avisos
    if (avisos.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: `${plural(avisos.length, "aviso esta semana", "avisos esta semana")}`,
            items: avisos.slice(0, 6).map(a => `${a.message}${a.t ? ` · ${cuando(a.t, hoy)}` : ""}`),
        });
    }

    // 3. Ingresos fallidos o temas de seguridad
    const seguridad = semana.filter(l => l.type === "auth" && /fall|incorrect|inv[aá]lid|rechaz|bloque|deneg/i.test(l.message));
    pasos.push(`Revisé los ingresos al sistema: ${plural(seguridad.length, "intento fallido", "intentos fallidos")}.`);
    if (seguridad.length > 0) {
        hallazgos.push({
            nivel: seguridad.length >= 3 ? "urgente" : "atencion",
            titulo: `${plural(seguridad.length, "intento de ingreso falló", "intentos de ingreso fallaron")}`,
            detalle: "Si no fuiste vos, cambiá la contraseña desde Mi perfil.",
            items: seguridad.slice(0, 6).map(l => `${l.message}${l.t ? ` · ${cuando(l.t, hoy)}` : ""}`),
            accion: { texto: "Ir a Mi perfil", href: "/perfil" },
        });
    }

    // 4. Actividad por área
    const porArea = new Map<string, number>();
    for (const l of semana) porArea.set(areaDe(l.message), (porArea.get(areaDe(l.message)) ?? 0) + 1);
    const areas = [...porArea.entries()].sort((a, b) => b[1] - a[1]);
    pasos.push(`Conté la actividad por área: ${areas.map(([a]) => a.toLowerCase()).slice(0, 3).join(", ") || "sin movimiento"}.`);
    if (areas.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: "Lo que más se movió esta semana",
            items: areas.slice(0, 6).map(([a, n]) => `${a} · ${plural(n, "registro", "registros")}`),
        });
    }

    if (errores.length === 0 && seguridad.length === 0) {
        hallazgos.unshift({ nivel: "bien", titulo: "Sin errores en los últimos 7 días", detalle: "El sistema viene funcionando sin problemas." });
    }

    const ultima = conFecha.reduce<number | null>((a, l) => (l.t !== null && (a === null || l.t > a) ? l.t : a), null);
    const metricas: Metrica[] = [
        { etiqueta: "Registros", valor: String(logs.length), detalle: "guardados en esta compu", tono: "neutro" },
        { etiqueta: "Errores (7 días)", valor: String(errores.length), detalle: errores24.length ? `${errores24.length} en las últimas 24 h` : "ninguno hoy", tono: errores.length ? "terracota" : "salvia" },
        { etiqueta: "Avisos (7 días)", valor: String(avisos.length), tono: avisos.length ? "arena" : "neutro" },
        { etiqueta: "Última actividad", valor: ultima ? cuando(ultima, hoy) : "—", tono: "neutro" },
    ];
    pasos.push("Listo: ordené lo encontrado de lo más urgente a lo menos.");
    const peso = { urgente: 0, atencion: 1, bien: 2, dato: 3 } as const;
    // Propuestas de mejora del área
    const propuestas: Propuesta[] = [];
    const repetido = repetidos.find(g => g.veces > 1);
    if (repetido) {
        propuestas.push({ impacto: "alto", titulo: `Revisá el error que se repite: "${repetido.mensaje.slice(0, 80)}"`, porque: `Pasó ${repetido.veces} veces esta semana: cuando un error vuelve, suele haber algo que no anda. Si no sabés qué es, pasámelo y lo vemos.` });
    }
    if (seguridad.length > 0) {
        propuestas.push({ impacto: seguridad.length >= 3 ? "alto" : "medio", titulo: "Cambiá la contraseña de ingreso", porque: `Hubo ${plural(seguridad.length, "intento fallido", "intentos fallidos")} esta semana. Si no fuiste vos, mejor cambiarla.`, accion: { texto: "Ir a Mi perfil", href: "/perfil" } });
    }
    if (errores.length > 0 && !repetido) {
        propuestas.push({ impacto: "bajo", titulo: "Fijate si internet anda bien cuando usás el sistema", porque: "Hubo errores sueltos que no se repitieron: suelen ser cortes de conexión." });
    }
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "No hace falta hacer nada", porque: "No hubo errores ni ingresos fallidos en los últimos 7 días." });
    const pesoImpacto = { alto: 0, medio: 1, bajo: 2 } as const;

    return {
        agente: "logs", pasos, metricas, hallazgos: [...hallazgos].sort((a, b) => peso[a.nivel] - peso[b.nivel]),
        propuestas: propuestas.sort((a, b) => pesoImpacto[a.impacto] - pesoImpacto[b.impacto]).slice(0, 4),
        asistentes: [
            { nombre: ASISTENTES.logs[0].nombre, hizo: `Leyó ${plural(semana.length, "registro", "registros")} de la semana.` },
            { nombre: ASISTENTES.logs[1].nombre, hizo: `Agrupó ${plural(repetidos.length, "tipo de error", "tipos de error")} y encontró ${plural(seguridad.length, "ingreso fallido", "ingresos fallidos")}.` },
        ],
    };
}
