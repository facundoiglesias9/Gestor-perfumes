// Datos del catálogo público, leídos en el servidor. Al navegador solo llegan columnas públicas:
// nunca costos, precio mayorista ni recetas.
import { cache } from "react";
import sql from "@/lib/db";
import { calculadorDisponibilidad } from "@/lib/perfume-hecho";
import type { CatalogoProducto } from "@/app/catalogo/CatalogoClient";
import type { NotasPerfume } from "@/lib/catalogo-perfume";

// Las descripciones que el sistema genera solo ("Generado de base ...") son notas internas.
function descripcionPublica(desc: unknown): string {
    const texto = desc ? String(desc).trim() : "";
    return /^generado de base/i.test(texto) ? "" : texto;
}

// cache(): si en el mismo pedido se piden dos veces (vista previa del link + la página), se lee una sola vez
export const getProductosPublicos = cache(async (): Promise<CatalogoProducto[] | null> => {
    try {
        // La receta se lee acá solo para saber qué esencia lleva y calcular la disponibilidad.
        const [rows, hechos, esencias] = await Promise.all([
            sql`
                SELECT id, name, category, gender, description, price_minorista, components,
                       -- solo las fotos cargadas desde la página Catálogo (las viejas en base64 pesaban demasiado)
                       CASE WHEN image_url LIKE '/api/foto/%' THEN image_url END AS foto
                FROM productos
                WHERE price_minorista > 0
                  AND COALESCE(visible_catalogo, true)
                ORDER BY name ASC
            `,
            sql`SELECT id, name, type, category, gender, qty FROM inventario WHERE type = 'Perfume Hecho'`,
            sql`SELECT id, name, price30g, price100g, cost FROM esencias`,
        ]);

        const disponibilidad = calculadorDisponibilidad(
            hechos.map(h => ({
                id: String(h.id), name: String(h.name ?? ""), type: String(h.type ?? ""),
                category: String(h.category ?? ""), gender: h.gender ? String(h.gender) : undefined, qty: Number(h.qty) || 0,
            })),
            esencias.map(e => ({ id: String(e.id), name: String(e.name ?? ""), price30g: e.price30g, price100g: e.price100g, cost: e.cost })),
        );

        return rows.map(r => {
            // Con el nombre y presentación tal cual están en la base (así se cargan los perfumes hechos)
            const { estado, dias } = disponibilidad({
                id: String(r.id), name: String(r.name ?? ""), category: String(r.category ?? ""),
                gender: r.gender ?? undefined, components: Array.isArray(r.components) ? r.components : [],
            });
            return {
                id: String(r.id),
                name: String(r.name ?? "").trim(),
                category: r.category ? String(r.category).trim() : "",
                gender: r.gender ? String(r.gender).trim() : "Unisex",
                description: descripcionPublica(r.description),
                price: Number(r.price_minorista) || 0,
                availability: estado,
                deliveryDays: dias,
                foto: r.foto ? String(r.foto) : null,
            };
        });
    } catch (err) {
        console.error("Catálogo público: no se pudieron leer los productos", err);
        return null;
    }
});

// Notas olfativas de los perfumes, por slug (si la tabla todavía no existe, el catálogo sigue sin notas)
export const getNotasPerfumes = cache(async (): Promise<Record<string, NotasPerfume>> => {
    try {
        const rows = await sql`SELECT slug, familia, salida, corazon, fondo, descripcion FROM perfume_notas`;
        return Object.fromEntries(rows.map(r => [String(r.slug), {
            familia: Array.isArray(r.familia) ? r.familia.map(String) : [],
            salida: r.salida ? String(r.salida) : "",
            corazon: r.corazon ? String(r.corazon) : "",
            fondo: r.fondo ? String(r.fondo) : "",
            descripcion: r.descripcion ? String(r.descripcion) : "",
        }]));
    } catch (err) {
        console.error("Catálogo público: no se pudieron leer las notas", err);
        return {};
    }
});

// Los más vendidos de los últimos 3 meses (unidades, sin contar ventas canceladas): solo los códigos
export const getMasPedidos = cache(async (): Promise<string[]> => {
    try {
        const rows = await sql`
            SELECT it->'producto'->>'id' AS id, SUM(COALESCE((it->>'quantity')::numeric, 0)) AS unidades
            FROM orders, jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) AS it
            WHERE created_at > now() - interval '90 days'
              AND COALESCE(status, '') <> 'cancelado'
              AND it->'producto'->>'id' IS NOT NULL
            GROUP BY 1
            ORDER BY unidades DESC
            LIMIT 30
        `;
        return rows.map(r => String(r.id));
    } catch (err) {
        console.error("Catálogo público: no se pudieron leer los más pedidos", err);
        return [];
    }
});
