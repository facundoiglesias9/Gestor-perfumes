'use server'

import sql from "./db";
import { esAdmin } from "./sesion";

// Página Catálogo: fotos de productos y qué se muestra a los clientes.
// Las fotos se guardan aparte (tabla producto_fotos) y se sirven en /api/foto/<id>; en el
// producto solo queda esa dirección, así el catálogo no carga imágenes gigantes en el texto.

const NO_AUTORIZADO = "Tu sesión venció. Volvé a ingresar.";
const TIPOS = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_BYTES = 1_500_000;

type Resultado<T = undefined> = { ok: true; dato?: T } | { ok: false; error: string };

export async function guardarFotoProducto(productoId: string, base64: string, tipo: string): Promise<Resultado<string>> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    if (!TIPOS.has(tipo)) return { ok: false, error: "Ese formato de imagen no se puede usar." };

    const datos = Buffer.from(String(base64 || ""), "base64");
    if (datos.length === 0) return { ok: false, error: "La imagen llegó vacía." };
    if (datos.length > MAX_BYTES) return { ok: false, error: "La imagen es muy pesada, probá con otra." };

    try {
        // La "v" cambia con cada foto nueva: así el navegador no muestra la anterior guardada
        const url = `/api/foto/${encodeURIComponent(productoId)}?v=${Date.now()}`;
        const res = await sql.begin(async (tx) => {
            const filas = await tx`update productos set image_url = ${url} where id = ${productoId} returning id`;
            if (filas.length === 0) return false;
            await tx`
                insert into producto_fotos (producto_id, tipo, datos, actualizado)
                values (${productoId}, ${tipo}, ${datos}, now())
                on conflict (producto_id) do update set tipo = excluded.tipo, datos = excluded.datos, actualizado = now()
            `;
            return true;
        });
        return res ? { ok: true, dato: url } : { ok: false, error: "No se encontró ese producto." };
    } catch (err) {
        console.error("Error al guardar foto:", err);
        return { ok: false, error: "No se pudo guardar la foto. Probá de nuevo." };
    }
}

export async function quitarFotoProducto(productoId: string): Promise<Resultado> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    try {
        await sql.begin(async (tx) => {
            await tx`delete from producto_fotos where producto_id = ${productoId}`;
            await tx`update productos set image_url = null where id = ${productoId}`;
        });
        return { ok: true };
    } catch (err) {
        console.error("Error al quitar foto:", err);
        return { ok: false, error: "No se pudo quitar la foto. Probá de nuevo." };
    }
}

export type CambiosPublicacion = {
    visible?: boolean;
    disponibilidad?: "disponible" | "demora" | "no-disponible";
    dias?: number;
};

// Cambia uno o varios productos a la vez (visible en el catálogo y disponibilidad)
export async function actualizarPublicaciones(ids: string[], cambios: CambiosPublicacion): Promise<Resultado> {
    if (!(await esAdmin())) return { ok: false, error: NO_AUTORIZADO };
    if (!Array.isArray(ids) || ids.length === 0) return { ok: true };

    const columnas: Record<string, unknown> = {};
    if (typeof cambios.visible === "boolean") columnas.visible_catalogo = cambios.visible;
    if (cambios.disponibilidad) {
        if (!["disponible", "demora", "no-disponible"].includes(cambios.disponibilidad)) return { ok: false, error: "Disponibilidad no válida." };
        columnas.availability_status = cambios.disponibilidad;
    }
    if (cambios.dias !== undefined) columnas.delivery_days = Math.max(0, Math.min(365, Math.round(Number(cambios.dias) || 0)));
    if (Object.keys(columnas).length === 0) return { ok: true };

    try {
        await sql`update productos set ${sql(columnas)} where id in ${sql(ids.map(String))}`;
        return { ok: true };
    } catch (err) {
        console.error("Error al actualizar publicaciones:", err);
        return { ok: false, error: "No se pudo guardar el cambio. Probá de nuevo." };
    }
}
