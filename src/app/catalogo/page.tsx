import type { Metadata } from "next";
import sql from "@/lib/db";
import CatalogoClient, { CatalogoProducto } from "./CatalogoClient";
import { calculadorDisponibilidad } from "@/lib/perfume-hecho";

export const metadata: Metadata = {
    title: "Catálogo | Scenta",
    description: "Perfumes, difusores y aromas para el hogar y el auto. Armá tu pedido y consultalo por WhatsApp.",
};

// Se regenera cada 5 minutos: los cambios de precio y de stock aparecen solos sin sobrecargar la base.
export const revalidate = 300;

// Las descripciones que el sistema genera solo ("Generado de base ...") son notas internas.
function descripcionPublica(desc: unknown): string {
    const texto = desc ? String(desc).trim() : "";
    return /^generado de base/i.test(texto) ? "" : texto;
}

async function getProductosPublicos(): Promise<CatalogoProducto[] | null> {
    try {
        // Al navegador solo llegan columnas públicas: nunca costos, precio mayorista ni recetas
        // (la receta se lee acá solo para saber qué esencia lleva y calcular la disponibilidad).
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
}

export default async function CatalogoPage() {
    const productos = await getProductosPublicos();
    return <CatalogoClient productos={productos} />;
}
