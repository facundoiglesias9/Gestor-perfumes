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
    /** Acordes cargados a mano desde el admin; si no hay, se calculan de las notas */
    acordes?: Acorde[] | null;
};

export type Acorde = { nombre: string; valor: number }; // valor de 0 a 100

// Fila de la tabla perfume_notas → NotasPerfume (con valores por defecto si falta algo)
export function filaANotas(r: Record<string, unknown>): NotasPerfume {
    const acordes = Array.isArray(r.acordes)
        ? (r.acordes as { nombre?: unknown; valor?: unknown }[])
            .map(a => ({ nombre: String(a?.nombre ?? ""), valor: Math.max(0, Math.min(100, Math.round(Number(a?.valor) || 0))) }))
            .filter(a => a.nombre && a.valor > 0)
        : null;
    return {
        familia: Array.isArray(r.familia) ? r.familia.map(String) : [],
        salida: r.salida ? String(r.salida) : "",
        corazon: r.corazon ? String(r.corazon) : "",
        fondo: r.fondo ? String(r.fondo) : "",
        descripcion: r.descripcion ? String(r.descripcion) : "",
        acordes: acordes && acordes.length > 0 ? acordes : null,
    };
}

// ── Acordes principales (las barras de "qué predomina") ──────────────────────
// Cada acorde con su color y las palabras de las notas que lo suman.
export const ACORDES: { nombre: string; color: string; palabras: string[] }[] = [
    { nombre: "Dulce", color: "#C98A9B", palabras: ["vainilla", "caramelo", "praliné", "pralinado", "miel", "azúcar", "algodón de azúcar", "chocolate", "cacao", "haba tonka", "malvavisco", "castaña", "regaliz", "dátil", "crema", "almendra", "palomitas", "cera de abejas", "maple"] },
    { nombre: "Floral", color: "#D9879A", palabras: ["rosa", "jazmín", "gardenia", "tuberosa", "peonía", "lirio", "magnolia", "fresia", "violeta", "iris", "azahar", "ylang", "orquídea", "jacinto", "nenúfar", "loto", "mimosa", "flor", "flores", "heliotropo", "madreselva", "clavel", "osmanthus", "camelia", "lila", "narciso", "neroli", "datura", "tiaré", "amapola", "frangipani", "pasionaria"] },
    { nombre: "Frutal", color: "#E0A35E", palabras: ["frambuesa", "durazno", "pera", "manzana", "ciruela", "grosella", "cassis", "frutilla", "cereza", "melón", "piña", "mango", "maracuyá", "lichi", "damasco", "arándano", "fruto", "fruta", "granada", "caqui", "membrillo", "coco", "higo", "mora", "guinda", "banano"] },
    { nombre: "Cítrico", color: "#D8C24A", palabras: ["bergamota", "limón", "lima", "mandarina", "naranja", "pomelo", "yuzu", "cítrico", "toronja", "petit grain", "verbena"] },
    { nombre: "Amaderado", color: "#9A7B5B", palabras: ["sándalo", "cedro", "vetiver", "madera", "pachulí", "guayaco", "gaiac", "teca", "abedul", "cashmeran", "akigalawood", "oud", "amyris", "abeto", "pino", "ciprés", "palo santo", "caoba", "kyara", "manzano"] },
    { nombre: "Especiado", color: "#C0673F", palabras: ["pimienta", "canela", "cardamomo", "jengibre", "clavo", "nuez moscada", "azafrán", "comino", "anís", "especia", "cilantro", "alcaravea", "cúrcuma", "davana"] },
    { nombre: "Aromático", color: "#7D9878", palabras: ["lavanda", "salvia", "romero", "albahaca", "menta", "tomillo", "artemisa", "enebro", "hinojo", "angélica", "laurel", "té", "mate", "ajenjo", "absenta", "shiso", "santolina", "geranio", "pelargonio"] },
    { nombre: "Fresco", color: "#6FA8C7", palabras: ["marina", "marino", "acuátic", "sal", "alga", "pepino", "ozónic", "agua", "helad", "mineral", "brisa"] },
    { nombre: "Ambarado", color: "#C79A4B", palabras: ["ámbar", "ambroxan", "labdanum", "benjuí", "incienso", "mirra", "opopónaco", "olíbano", "resina", "bálsamo", "estoraque"] },
    { nombre: "Almizclado", color: "#A99BB8", palabras: ["almizcle", "ambreta", "almizclad"] },
    { nombre: "Cuero", color: "#7A5A48", palabras: ["cuero", "gamuza", "tabaco", "castóreo"] },
    { nombre: "Verde", color: "#6E9E5F", palabras: ["verde", "hoja", "gálbano", "hiedra", "bambú", "musgo"] },
];
export const colorAcorde = (nombre: string) => ACORDES.find(a => a.nombre === nombre)?.color ?? "#7D9878";

// Familia olfativa → acorde que la representa (la familia suma un extra a su acorde)
const FAMILIA_A_ACORDE: Record<string, string> = {
    "Dulce": "Dulce", "Floral": "Floral", "Frutal": "Frutal", "Cítrico": "Cítrico", "Amaderado": "Amaderado",
    "Especiado": "Especiado", "Aromático": "Aromático", "Fougère": "Aromático", "Acuático": "Fresco",
    "Oriental": "Ambarado", "Ámbar": "Ambarado", "Almizclado": "Almizclado", "Cuero": "Cuero", "Verde": "Verde",
    "Chipre": "Amaderado", "Aldehídico": "Floral",
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Compara por palabra, no por pedazos de texto: "té" no tiene que coincidir con "pétalos" ni
// "sal" con "salvia". Las palabras de más de 3 letras aceptan plurales ("maderas" → "madera").
function contiene(nota: string, clave: string) {
    const k = sinTildes(clave);
    if (k.includes(" ")) return nota.includes(k);
    const palabras = nota.split(/[^a-z0-9]+/);
    return k.length <= 3 ? palabras.includes(k) : palabras.some(w => w.startsWith(k));
}

// Calcula los acordes de un perfume a partir de sus notas: cada nota suma a su acorde, y las del
// fondo pesan más porque son las que más duran. Devuelve los principales, de 0 a 100.
export function calcularAcordes(n: Pick<NotasPerfume, "familia" | "salida" | "corazon" | "fondo">, cantidad = 5): Acorde[] {
    const puntos = new Map<string, number>();
    const niveles: [string, number][] = [[n.salida, 1], [n.corazon, 1.25], [n.fondo, 1.5]];
    for (const [texto, peso] of niveles) {
        // "pimienta rosa", "baya rosa" y "palo de rosa" no son flores
        const limpio = sinTildes(texto || "").replace(/(pimienta|baya) rosa/g, "$1").replace(/palo de rosa/g, "madera");
        for (const nota of limpio.split(/[,;]/).map(s => s.trim()).filter(Boolean)) {
            for (const a of ACORDES) {
                if (a.palabras.some(p => contiene(nota, p))) puntos.set(a.nombre, (puntos.get(a.nombre) ?? 0) + peso);
            }
        }
    }
    // La familia declarada asegura que su acorde figure arriba
    (n.familia || []).forEach((f, i) => {
        const a = FAMILIA_A_ACORDE[f];
        if (a) puntos.set(a, (puntos.get(a) ?? 0) + (i === 0 ? 2.5 : 1.5));
    });
    const max = Math.max(0, ...puntos.values());
    if (max === 0) return [];
    return [...puntos.entries()]
        .map(([nombre, p]) => ({ nombre, valor: Math.round((p / max) * 100) }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, cantidad)
        .filter(a => a.valor >= 20);
}

// Los acordes a mostrar: los cargados a mano si hay, si no los calculados
export const acordesDe = (n: NotasPerfume): Acorde[] =>
    n.acordes && n.acordes.length > 0 ? [...n.acordes].sort((a, b) => b.valor - a.valor) : calcularAcordes(n);

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
