'use server'

// Pone a trabajar a los agentes del negocio desde la página /agentes.
// Lee los datos de la base, ejecuta el trabajo del agente (agentes.ts), le pide a la IA un
// resumen si hay una clave de Anthropic configurada, y guarda el resultado para verlo después.
// Como toda acción de servidor, chequea que haya una sesión de administrador.
import sql from './db';
import { esAdmin } from './sesion';
import { TRABAJO, type Parcial } from './agentes';
import { leerDatos } from './agentes-datos';
import { instagramConfigurado } from './instagram';
import { AGENTES, type IdAgente, type IdAgenteServidor, type ResultadoAgente } from './agentes-tipos';

const NO_AUTORIZADO = 'Tu sesión venció. Volvé a ingresar.';
const IDS = new Set<IdAgente>(AGENTES.map(a => a.id));
const claveConfig = (id: IdAgente) => `agente_${id}`;
// Modelo rápido y barato: alcanza para resumir lo que encontró cada agente
const MODELO_IA = 'claude-haiku-5-5';

type Respuesta<T> = { ok: true; dato: T } | { ok: false; error: string };

// Resumen en lenguaje natural con la IA (si no hay clave o falla, el agente igual funciona)
async function resumirConIA(nombre: string, r: Omit<ResultadoAgente, 'resumenIA'>): Promise<string | null> {
    const clave = process.env.ANTHROPIC_API_KEY;
    if (!clave) return null;
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
                model: MODELO_IA,
                max_tokens: 400,
                system: `Sos el agente "${nombre}" de Scenta, una marca argentina de fragancias que vende por WhatsApp. ` +
                    'Le hablás al dueño, que no es técnico. En 3 o 4 frases en español rioplatense, decile qué es lo más importante ' +
                    'de lo que encontraste y qué le conviene hacer primero. Usá solo los datos que te paso: no inventes números ni productos.',
                messages: [{ role: 'user', content: JSON.stringify({ metricas: r.metricas, hallazgos: r.hallazgos, propuestas: r.propuestas ?? [], equipo: r.equipo ?? null }) }],
            }),
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const texto = (data?.content ?? []).filter((c: any) => c?.type === 'text').map((c: any) => c.text).join('\n').trim();
        return texto || null;
    } catch {
        return null;
    }
}

// Le suma el resumen de la IA (si está conectada) y guarda la revisión en la tabla config
// (una fila por agente), así al volver a entrar se ve la última
async function terminar(parcial: Parcial, inicio: number): Promise<ResultadoAgente> {
    const base = { ...parcial, ejecutadoEn: new Date().toISOString(), duracionMs: 0 };
    const nombre = AGENTES.find(a => a.id === parcial.agente)!.nombre;
    const resumenIA = await resumirConIA(nombre, base);
    const resultado: ResultadoAgente = { ...base, resumenIA, duracionMs: Date.now() - inicio };
    await sql`
        INSERT INTO config (key, value, updated_at) VALUES (${claveConfig(parcial.agente)}, ${JSON.stringify(resultado)}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    return resultado;
}

/** Pone a trabajar a un agente del servidor y guarda lo que encontró */
export async function ejecutarAgente(id: IdAgenteServidor): Promise<Respuesta<ResultadoAgente>> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    if (!(id in TRABAJO)) return { ok: false, error: 'Ese agente no existe.' };
    const inicio = Date.now();
    try {
        const datos = await leerDatos({ instagram: id === 'marketing' });
        return { ok: true, dato: await terminar(TRABAJO[id](datos), inicio) };
    } catch (err) {
        console.error(`Agente ${id}:`, err);
        return { ok: false, error: 'El agente no pudo terminar su trabajo. Probá de nuevo.' };
    }
}

/**
 * Los agentes de Logs y de Experiencia de usuario trabajan en el navegador (los registros viven
 * ahí, y las páginas se prueban como las ve un usuario): mandan lo que encontraron y acá se completa
 * con la IA y se guarda. Se limita el tamaño para que no se pueda guardar cualquier cosa.
 */
export async function guardarRevisionNavegador(parcial: Parcial, duracionMs: number): Promise<Respuesta<ResultadoAgente>> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    if (!['logs', 'experiencia'].includes(parcial?.agente) || !Array.isArray(parcial.pasos) || !Array.isArray(parcial.hallazgos) || !Array.isArray(parcial.metricas)) {
        return { ok: false, error: 'Revisión inválida.' };
    }
    if (JSON.stringify(parcial).length > 30_000) return { ok: false, error: 'La revisión es demasiado grande.' };
    try {
        const inicio = Date.now() - Math.max(0, Math.min(Number(duracionMs) || 0, 60_000));
        return { ok: true, dato: await terminar(parcial, inicio) };
    } catch (err) {
        console.error(`Agente ${parcial.agente}:`, err);
        return { ok: false, error: 'No se pudo guardar la revisión.' };
    }
}

/** Fotos de los productos publicados, para que el agente de Experiencia pruebe que carguen bien */
export async function fotosCatalogo(): Promise<Respuesta<{ nombre: string; url: string }[]>> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    try {
        const filas = await sql`
            SELECT name, category, image_url FROM productos
            WHERE visible_catalogo IS NOT FALSE AND price_minorista > 0 AND image_url LIKE '/api/foto/%'
            ORDER BY name LIMIT 40
        `;
        return { ok: true, dato: filas.map(f => ({ nombre: `${String(f.name ?? '').trim()} ${String(f.category ?? '').trim()}`.trim(), url: String(f.image_url) })) };
    } catch (err) {
        console.error('Fotos del catálogo:', err);
        return { ok: false, error: 'No se pudieron leer las fotos del catálogo.' };
    }
}

/** Última revisión de cada agente y si la IA está conectada */
export async function estadoAgentes(): Promise<Respuesta<{ ultimos: Partial<Record<IdAgente, ResultadoAgente>>; iaConectada: boolean; instagramConectado: boolean }>> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    try {
        const filas = await sql`SELECT key, value FROM config WHERE key = ANY(${AGENTES.map(a => claveConfig(a.id))})`;
        const ultimos: Partial<Record<IdAgente, ResultadoAgente>> = {};
        for (const f of filas) {
            try {
                const r = JSON.parse(String(f.value)) as ResultadoAgente;
                if (IDS.has(r.agente)) ultimos[r.agente] = r;
            } catch { /* fila vieja o rota: se ignora */ }
        }
        return { ok: true, dato: { ultimos, iaConectada: !!process.env.ANTHROPIC_API_KEY, instagramConectado: instagramConfigurado() } };
    } catch (err) {
        console.error('Estado de los agentes:', err);
        return { ok: false, error: 'No se pudo leer la última revisión de los agentes.' };
    }
}
