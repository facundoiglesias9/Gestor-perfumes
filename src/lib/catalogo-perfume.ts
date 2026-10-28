// Cómo se identifica cada perfume en el catálogo público: el link (slug) y sus tamaños.
// Lo usan el servidor (vista previa del link al compartir) y el navegador (ficha del perfume).
import { extractBrand } from "@/lib/product-utils";

type ProductoBase = { name: string; category: string; gender: string };

export type TipoProducto = "perfumes" | "difusores" | "auto";

// Notas olfativas de un perfume (tabla perfume_notas), por su slug
export type NotasPerfume = {
    familia: string[];
    salida: string;
    corazon: string;
    fondo: string;
    descripcion: string;
};

// Tipo de producto según su categoría: los frascos de 30/50 ML son perfumes
export const tipoDe = (p: { category: string }): TipoProducto => {
    const c = (p.category || "").toLowerCase();
    if (c.includes("difusor")) return "difusores";
    if (c.includes("auto")) return "auto";
    return "perfumes";
};

// Tamaño del frasco (30, 50…) sacado de la categoría ("Frascos de 50 ML") o del nombre
export const mlDe = (p: { category: string; name: string }): number | null => {
    const m = (p.category || "").match(/(\d+)\s*ml/i) ?? (p.name || "").match(/(\d+)\s*ml\b/i);
    return m ? Number(m[1]) : null;
};

// "212 VIP 50ML (C. HERRERA)" → { nombre: "212 VIP", marca: "C. HERRERA" }: el tamaño ya se muestra aparte
export const nombreYMarca = (name: string) => {
    const { title, brand } = extractBrand(name);
    const nombre = title.replace(/\s+(\d+\s*ML|DIFUSOR|AUTO)\s*$/i, "").trim() || title;
    return { nombre, marca: brand || "" };
};

const aSlug = (texto: string) =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/&/g, " y ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Link del perfume: nombre sin tamaño + género (hay perfumes con el mismo nombre para hombre y mujer).
// Los tamaños del mismo perfume comparten el link; difusores y auto llevan su tipo para no mezclarse.
export const slugDe = (p: ProductoBase) => {
    const tipo = tipoDe(p);
    const { nombre } = nombreYMarca(p.name);
    return aSlug(`${nombre} ${tipo === "perfumes" ? p.gender || "unisex" : tipo}`) || "perfume";
};

// Agrupa los productos por perfume, con los tamaños ordenados de menor a mayor
export function agruparPorPerfume<T extends ProductoBase>(productos: T[]): Map<string, T[]> {
    const grupos = new Map<string, T[]>();
    for (const p of productos) {
        const s = slugDe(p);
        const g = grupos.get(s);
        if (g) g.push(p);
        else grupos.set(s, [p]);
    }
    for (const g of grupos.values()) g.sort((a, b) => (mlDe(a) ?? 0) - (mlDe(b) ?? 0));
    return grupos;
}
