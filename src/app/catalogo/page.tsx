import type { Metadata } from "next";
import sql from "@/lib/db";
import CatalogoClient, { CatalogoProducto } from "./CatalogoClient";

export const metadata: Metadata = {
    title: "Catálogo | Scenta",
    description: "Perfumes, difusores y aromas para el hogar y el auto. Armá tu pedido y consultalo por WhatsApp.",
};

// Se regenera cada 5 minutos: los cambios de precio aparecen solos sin sobrecargar la base.
export const revalidate = 300;

// Las descripciones que el sistema genera solo ("Generado de base ...") son notas internas.
function descripcionPublica(desc: unknown): string {
    const texto = desc ? String(desc).trim() : "";
    return /^generado de base/i.test(texto) ? "" : texto;
}

async function getProductosPublicos(): Promise<CatalogoProducto[] | null> {
    try {
        // Solo columnas públicas: nunca costos, precio mayorista ni componentes.
        const rows = await sql`
            SELECT id, name, category, gender, description, price_minorista,
                   availability_status, delivery_days,
                   -- solo las fotos cargadas desde la página Catálogo (las viejas en base64 pesaban demasiado)
                   CASE WHEN image_url LIKE '/api/foto/%' THEN image_url END AS foto
            FROM productos
            WHERE price_minorista > 0
              AND COALESCE(visible_catalogo, true)
            ORDER BY name ASC
        `;
        return rows.map(r => ({
            id: String(r.id),
            name: String(r.name ?? "").trim(),
            category: r.category ? String(r.category).trim() : "",
            gender: r.gender ? String(r.gender).trim() : "Unisex",
            description: descripcionPublica(r.description),
            price: Number(r.price_minorista) || 0,
            availability: r.availability_status === "demora" ? "demora" : r.availability_status === "no-disponible" ? "sin-stock" : "disponible",
            deliveryDays: Number(r.delivery_days) || 0,
            foto: r.foto ? String(r.foto) : null,
        }));
    } catch (err) {
        console.error("Catálogo público: no se pudieron leer los productos", err);
        return null;
    }
}

export default async function CatalogoPage() {
    const productos = await getProductosPublicos();
    return <CatalogoClient productos={productos} />;
}
