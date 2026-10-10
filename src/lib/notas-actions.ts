'use server'

import sql from "./db";
import { usuarioActual } from "./sesion";

// Notas personales: se guardan en la base (antes vivían solo en el navegador y se perdían).
// Cada nota es de quien la escribió: todas las consultas filtran por el usuario de la sesión.

const NO_AUTORIZADO = "Tu sesión venció. Volvé a ingresar.";
const MAX_TEXTO = 20_000;
const ID_VALIDO = /^[\w-]{1,64}$/;

export type ColorNota = "salvia" | "arena" | "terracota" | "rosa" | "cielo" | "gris";
const COLORES = new Set<ColorNota>(["salvia", "arena", "terracota", "rosa", "cielo", "gris"]);

export type Nota = {
    id: string;
    texto: string;
    color: ColorNota;
    fijada: boolean;
    creada: string;
    editada: string;
};

type Resultado<T = undefined> = { ok: true; dato?: T } | { ok: false; error: string };

async function duenio(): Promise<string | null> {
    try {
        const u = await usuarioActual();
        return u?.role === "admin" ? u.id : null;
    } catch {
        return null;
    }
}

const aNota = (f: Record<string, any>): Nota => ({
    id: f.id,
    texto: f.texto,
    color: COLORES.has(f.color) ? f.color : "salvia",
    fijada: !!f.fijada,
    creada: new Date(f.creada).toISOString(),
    editada: new Date(f.editada).toISOString(),
});

const limpiarTexto = (t: unknown) => String(t ?? "").slice(0, MAX_TEXTO);
const limpiarColor = (c: unknown): ColorNota => (COLORES.has(c as ColorNota) ? (c as ColorNota) : "salvia");
const fechaValida = (f: unknown) => {
    const d = new Date(String(f ?? ""));
    return Number.isNaN(d.getTime()) ? new Date() : d;
};

export async function listarNotas(): Promise<Resultado<Nota[]>> {
    const uid = await duenio();
    if (!uid) return { ok: false, error: NO_AUTORIZADO };
    try {
        const filas = await sql`
            select id, texto, color, fijada, creada, editada from notas
            where usuario_id = ${uid}
            order by fijada desc, creada desc`;
        return { ok: true, dato: filas.map(aNota) };
    } catch (err) {
        console.error("Error al leer notas:", err);
        return { ok: false, error: "No se pudieron cargar las notas." };
    }
}

// El id lo arma la página, así la nota aparece al instante y después se confirma.
// También sirve para "Deshacer" un borrado: vuelve a crear la nota tal cual estaba.
export async function crearNota(nota: { id: string; texto: string; color?: string; fijada?: boolean; creada?: string; editada?: string }): Promise<Resultado<Nota>> {
    const uid = await duenio();
    if (!uid) return { ok: false, error: NO_AUTORIZADO };
    if (!ID_VALIDO.test(String(nota?.id))) return { ok: false, error: "Nota no válida." };
    try {
        const ahora = new Date();
        const filas = await sql`
            insert into notas (id, usuario_id, texto, color, fijada, creada, editada)
            values (${nota.id}, ${uid}, ${limpiarTexto(nota.texto)}, ${limpiarColor(nota.color)}, ${!!nota.fijada},
                    ${nota.creada ? fechaValida(nota.creada) : ahora}, ${nota.editada ? fechaValida(nota.editada) : ahora})
            on conflict (id) do nothing
            returning id, texto, color, fijada, creada, editada`;
        if (filas.length === 0) return { ok: false, error: "Esa nota ya existe." };
        return { ok: true, dato: aNota(filas[0]) };
    } catch (err) {
        console.error("Error al crear nota:", err);
        return { ok: false, error: "No se pudo guardar la nota. Probá de nuevo." };
    }
}

export async function actualizarNota(id: string, cambios: { texto?: string; color?: string; fijada?: boolean }): Promise<Resultado<Nota>> {
    const uid = await duenio();
    if (!uid) return { ok: false, error: NO_AUTORIZADO };
    if (!ID_VALIDO.test(String(id))) return { ok: false, error: "Nota no válida." };

    const columnas: Record<string, unknown> = {};
    if (cambios.texto !== undefined) {
        columnas.texto = limpiarTexto(cambios.texto);
        columnas.editada = new Date();
    }
    if (cambios.color !== undefined) columnas.color = limpiarColor(cambios.color);
    if (typeof cambios.fijada === "boolean") columnas.fijada = cambios.fijada;
    if (Object.keys(columnas).length === 0) return { ok: true };

    try {
        const filas = await sql`
            update notas set ${sql(columnas)}
            where id = ${id} and usuario_id = ${uid}
            returning id, texto, color, fijada, creada, editada`;
        if (filas.length === 0) return { ok: false, error: "No se encontró esa nota." };
        return { ok: true, dato: aNota(filas[0]) };
    } catch (err) {
        console.error("Error al actualizar nota:", err);
        return { ok: false, error: "No se pudo guardar el cambio. Probá de nuevo." };
    }
}

export async function borrarNota(id: string): Promise<Resultado> {
    const uid = await duenio();
    if (!uid) return { ok: false, error: NO_AUTORIZADO };
    try {
        await sql`delete from notas where id = ${String(id)} and usuario_id = ${uid}`;
        return { ok: true };
    } catch (err) {
        console.error("Error al borrar nota:", err);
        return { ok: false, error: "No se pudo borrar la nota. Probá de nuevo." };
    }
}

// Pasa a la base las notas que habían quedado guardadas solo en este navegador.
// Si una ya estaba (mismo id), no la duplica.
export async function importarNotas(notas: { id: string; texto: string; color?: string; creada?: string }[]): Promise<Resultado<number>> {
    const uid = await duenio();
    if (!uid) return { ok: false, error: NO_AUTORIZADO };
    const filas = (Array.isArray(notas) ? notas : [])
        .filter(n => ID_VALIDO.test(String(n?.id)) && String(n?.texto ?? "").trim())
        .slice(0, 500)
        .map(n => {
            const creada = fechaValida(n.creada);
            return { id: n.id, usuario_id: uid, texto: limpiarTexto(n.texto), color: limpiarColor(n.color), fijada: false, creada, editada: creada };
        });
    if (filas.length === 0) return { ok: true, dato: 0 };
    try {
        const res = await sql`insert into notas ${sql(filas)} on conflict (id) do nothing returning id`;
        return { ok: true, dato: res.length };
    } catch (err) {
        console.error("Error al importar notas:", err);
        return { ok: false, error: "No se pudieron pasar las notas guardadas en este navegador." };
    }
}
