import sql from "@/lib/db";

// Foto de un producto para el catálogo (pública: la ven los clientes).
// La dirección lleva ?v=<fecha> y cambia con cada foto nueva, así que se puede guardar
// en caché "para siempre": Vercel la sirve sin volver a consultar la base.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const filas = await sql`select tipo, datos from producto_fotos where producto_id = ${id}`;
        const foto = filas[0];
        if (!foto) return new Response("No hay foto", { status: 404 });
        return new Response(new Uint8Array(foto.datos), {
            headers: {
                "Content-Type": foto.tipo,
                "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            },
        });
    } catch (err) {
        console.error("Error al leer foto:", err);
        return new Response("No se pudo leer la foto", { status: 500 });
    }
}
