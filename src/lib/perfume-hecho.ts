// Perfumes ya preparados: una fila de inventario por producto, con código fijo "PH-<código del producto>".
// Va en un archivo aparte (sin "use client") para poder usarlo también en el servidor (catálogo público).

// Mismo nombre sin importar mayúsculas ni espacios de más
export const mismoNombre = (a?: string, b?: string) =>
    (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export const idPerfumeHecho = (productoId: string) => `PH-${productoId}`;

type FilaInventario = { id: string; name: string; type: string; category: string; gender?: string };

// ── Disponibilidad automática del catálogo ──────────────────────
// 1. Hay perfumes hechos en el inventario → disponible.
// 2. Si no, y la esencia de la receta está "a consultar" (sin precio con el proveedor) → sin stock.
// 3. Si no → con demora (hay que prepararlo).
export const DIAS_PREPARACION = 7;

export type EstadoAutomatico = {
    estado: "disponible" | "demora" | "sin-stock";
    dias: number;
    hechos: number;
};

type Componente = { id?: string; name?: string; type?: string };
type EsenciaPrecio = { id: string; name: string; price30g?: unknown; price100g?: unknown; cost?: unknown };

// "Consultar": la esencia no tiene precio de 30 g ni de 100 g, ni costo cargado
export const esenciaAConsultar = (e: EsenciaPrecio) =>
    typeof e.price30g !== "number" && typeof e.price100g !== "number" && !(Number(e.cost) > 0);

// Prepara la búsqueda una sola vez y devuelve la función que calcula cada producto
export function calculadorDisponibilidad<T extends FilaInventario & { qty: number }>(inventario: T[], esencias: EsenciaPrecio[]) {
    const hechos = inventario.filter(i => i.type === "Perfume Hecho");
    const consultar = esencias.filter(esenciaAConsultar);
    const ids = new Set(consultar.map(e => e.id));
    const nombres = new Set(consultar.map(e => (e.name ?? "").trim().toLowerCase()));
    // La receta guarda el código de la esencia; las viejas a veces solo el nombre
    const usaEsenciaAConsultar = (c: Componente) =>
        c.type === "Esencia" && ((!!c.id && ids.has(c.id)) || nombres.has((c.name ?? "").trim().toLowerCase()));

    return (producto: { id: string; name: string; category: string; gender?: string; components?: Componente[] }): EstadoAutomatico => {
        const cantidad = Number(buscarPerfumeHecho(hechos, producto)?.qty) || 0;
        if (cantidad > 0) return { estado: "disponible", dias: 0, hechos: cantidad };
        if ((producto.components ?? []).some(usaEsenciaAConsultar)) return { estado: "sin-stock", dias: 0, hechos: 0 };
        return { estado: "demora", dias: DIAS_PREPARACION, hechos: 0 };
    };
}

// Fila de perfumes hechos de un producto (las cargadas antes de usar el código se buscan por nombre, presentación y género).
export function buscarPerfumeHecho<T extends FilaInventario>(inventario: T[], producto: { id: string; name: string; category: string; gender?: string }) {
    return inventario.find(i => i.id === idPerfumeHecho(producto.id))
        ?? inventario.find(i => i.type === "Perfume Hecho" && !i.id.startsWith("PH-")
            && mismoNombre(i.name, producto.name) && mismoNombre(i.category, producto.category)
            && (!i.gender || !producto.gender || mismoNombre(i.gender, producto.gender)));
}
