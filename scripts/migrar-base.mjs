// Migración de Scenta a una base PostgreSQL nueva (Neon, Supabase, etc.).
//
// Uso:
//   node scripts/migrar-base.mjs                              -> modo prueba: muestra qué cargaría, no escribe nada
//   node scripts/migrar-base.mjs --aplicar                    -> crea las tablas y carga los datos
//   node scripts/migrar-base.mjs --base respaldos/respaldo-base-AAAA-MM-DD.json
//                                                             -> usa una copia completa hecha con scripts/exportar-base.mjs
//   node scripts/migrar-base.mjs --respaldo archivo.json      -> usa un respaldo descargado de /respaldo-local.html
//   node scripts/migrar-base.mjs --excel otro.xlsx            -> usa otro Excel (por defecto Base_Datos_Scenta_Completa.xlsx)
//
// La base de destino se toma de DATABASE_URL (variable de entorno o .env.local).
// Prioridad de datos por tabla: copia completa de la base > respaldo del navegador > Excel (30/4/2026).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import ExcelJS from "exceljs";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const APLICAR = args.includes("--aplicar");
const RESPALDO = opt("--respaldo");
const BASE = opt("--base");
const EXCEL = opt("--excel") ?? path.join(ROOT, "Base_Datos_Scenta_Completa.xlsx");

// ─── Helpers ─────────────────────────────────────────────────────
const num = (v, def = 0) => {
    if (v === null || v === undefined || v === "" || v === "consultar") return def;
    if (typeof v === "object" && "result" in v) v = v.result; // celdas con fórmula
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : def;
};
const numOrNull = (v) => num(v, null);
const str = (v, def = null) => {
    if (v === null || v === undefined) return def;
    if (typeof v === "object" && "richText" in v) v = v.richText.map(t => t.text).join("");
    if (typeof v === "object" && "result" in v) v = v.result;
    if (v instanceof Date) return v.toLocaleDateString("es-AR");
    const s = String(v).trim();
    return s === "" ? def : s;
};

// ─── Mapeos desde el formato de la app (lo que guarda el navegador) ─
const desdeApp = {
    categorias: c => ({ id: str(c.id), name: str(c.name, ""), count: num(c.count) }),
    proveedores: p => ({ id: str(p.id), name: str(p.name, ""), contact: str(p.contact, "") }),
    esencias: e => ({
        id: str(e.id), name: str(e.name, ""), category: str(e.category), gender: str(e.gender), provider: str(e.provider),
        cost: num(e.cost), cost_usd: numOrNull(e.costUsd), qty: num(e.qty),
        price30g: numOrNull(e.price30g), price100g: numOrNull(e.price100g), price250g: numOrNull(e.price250g),
        price100g_usd: numOrNull(e.price100gUsd), price250g_usd: numOrNull(e.price250gUsd),
        last_update: str(e.lastUpdate), source: str(e.source, "manual"),
    }),
    insumos: i => ({
        id: str(i.id), name: str(i.name, ""), category: str(i.category), provider: str(i.provider),
        cost: num(i.cost), qty: num(i.qty), stock: num(i.stock), unit: str(i.unit, "un."),
    }),
    bases: b => ({
        id: str(b.id), name: str(b.name, ""), components: b.components ?? [],
        essence_gender: str(b.essenceGender), essence_grams: numOrNull(b.essenceGrams), category: str(b.category),
    }),
    productos: p => ({
        id: str(p.id), name: str(p.name, ""), category: str(p.category), base_id: str(p.baseId, ""),
        components: p.components ?? [], cost: num(p.cost), price: num(p.price), price_minorista: num(p.priceMinorista),
        stock: num(p.stock), description: str(p.description, ""), gender: str(p.gender, "Unisex"),
        last_update: str(p.lastUpdate), image_url: str(p.imageUrl),
        availability_status: str(p.availabilityStatus, "disponible"), delivery_days: Math.round(num(p.deliveryDays)),
    }),
    inventario: i => ({
        id: str(i.id), name: str(i.name), type: str(i.type), category: str(i.category), qty: num(i.qty),
        last_update: str(i.lastUpdate), unit: str(i.unit, "un."), gender: str(i.gender),
    }),
    transacciones: t => ({ id: str(t.id), type: str(t.type), amount: num(t.amount), description: str(t.description), date: str(t.date) }),
    usuarios: u => ({
        id: str(u.id), username: str(u.username, ""), email: str(u.email), password: str(u.password),
        role: str(u.role, "minorista"), status: str(u.status, "Activo"), last_login: str(u.lastLogin), notas: str(u.notas),
    }),
    orders: o => ({
        id: str(o.id), items: o.items ?? [], total: num(o.total), status: str(o.status, "solicitud recibida"),
        customer_name: str(o.customerName), date: str(o.date), payment_method: str(o.paymentMethod, "efectivo"),
        payment_status: str(o.paymentStatus, "pendiente"), cancelation_reason: str(o.cancelationReason),
    }),
    promociones: p => ({
        id: str(p.id), product_id: str(p.productId), discount_percentage: num(p.discountPercentage),
        is_active: p.isActive !== false, end_date: str(p.endDate),
    }),
};

const JSON_COLUMNS = { bases: ["components"], productos: ["components"], orders: ["items"] };

// Columnas de cada tabla en db/schema.sql. Las numéricas se convierten (Xata las devolvía como texto).
const COLUMNAS = {
    categorias: ["id", "name", "count", "created_at"],
    proveedores: ["id", "name", "contact", "created_at"],
    esencias: ["id", "name", "category", "gender", "provider", "cost", "cost_usd", "qty", "price30g", "price100g", "price250g", "price100g_usd", "price250g_usd", "last_update", "source", "created_at"],
    insumos: ["id", "name", "category", "provider", "cost", "qty", "stock", "unit", "created_at"],
    bases: ["id", "name", "components", "essence_gender", "essence_grams", "category", "created_at"],
    productos: ["id", "name", "category", "base_id", "components", "cost", "price", "price_minorista", "stock", "description", "gender", "last_update", "image_url", "availability_status", "delivery_days", "created_at"],
    inventario: ["id", "name", "type", "category", "qty", "last_update", "unit", "gender", "created_at"],
    transacciones: ["id", "type", "amount", "description", "date", "created_at"],
    usuarios: ["id", "username", "email", "password", "role", "status", "last_login", "notas", "created_at"],
    orders: ["id", "items", "total", "status", "customer_name", "date", "payment_method", "payment_status", "cancelation_reason", "created_at"],
    promociones: ["id", "product_id", "discount_percentage", "is_active", "end_date", "created_at"],
    config: ["key", "value", "updated_at"],
    solicitudes_mayorista: ["id", "user_id", "username", "nombre", "apellido", "mail", "celular", "motivo", "estado", "motivo_rechazo", "fecha_reintento", "created_at"],
};
const NUMERICAS = new Set(["count", "cost", "cost_usd", "qty", "price30g", "price100g", "price250g", "price100g_usd", "price250g_usd",
    "stock", "essence_grams", "price", "price_minorista", "delivery_days", "amount", "total", "discount_percentage"]);
const ENTERAS = new Set(["count", "delivery_days"]);
const CLAVE = { config: "key" };

// "6/3/2026" o ISO -> ISO; sirve para completar created_at vacíos a partir de la fecha visible.
const aIso = (v) => {
    const s = str(v);
    if (!s) return null;
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const d = dmy ? new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1], 12)) : new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
};

function leerBase(file) {
    if (!file) return {};
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const out = {};
    for (const [tabla, cols] of Object.entries(COLUMNAS)) {
        const filas = raw.datos?.[tabla];
        if (!Array.isArray(filas)) continue;
        out[tabla] = filas.map(f => {
            const r = {};
            for (const c of cols) {
                let v = f[c] ?? null;
                if (NUMERICAS.has(c)) {
                    v = numOrNull(v);
                    if (v !== null && ENTERAS.has(c)) v = Math.round(v);
                }
                r[c] = v;
            }
            if (tabla === "solicitudes_mayorista") r.id = Math.round(num(r.id));
            if ("created_at" in r && !r.created_at) r.created_at = aIso(f.date) ?? aIso(f.last_update);
            return r;
        });
    }
    return { tablas: out, fecha: raw.fecha, origen: raw.origen };
}

// ─── Lectura del Excel ───────────────────────────────────────────
const ESTADOS_EXCEL = { "con demora": "demora", "disponible": "disponible", "sin stock": "no-disponible" };

async function leerExcel(file) {
    if (!fs.existsSync(file)) return {};
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const filas = (hoja) => {
        const ws = wb.getWorksheet(hoja);
        if (!ws) return [];
        const out = [];
        ws.eachRow((row, i) => { if (i > 1 && str(row.getCell(1).value)) out.push(c => row.getCell(c).value); });
        return out;
    };
    return {
        esencias: filas("Esencias").map(c => ({
            id: str(c(1)), name: str(c(2), ""), category: str(c(3)), gender: str(c(4)), provider: str(c(5)),
            cost: num(c(6)), cost_usd: numOrNull(c(7)), qty: num(c(8)),
            price30g: numOrNull(c(9)), price100g: numOrNull(c(10)), price250g: numOrNull(c(11)),
            price100g_usd: null, price250g_usd: null, last_update: null, source: "manual",
        })),
        insumos: filas("Insumos").map(c => ({
            id: str(c(1)), name: str(c(2), ""), category: str(c(3)), provider: str(c(4)),
            cost: num(c(5)), qty: num(c(6)), stock: num(c(7)), unit: str(c(8), "un."),
        })),
        productos: filas("Listas de Precios").map(c => ({
            id: str(c(1)), name: str(c(2), ""), category: str(c(3)), base_id: "", components: [],
            cost: num(c(5)), price: num(c(6)), price_minorista: num(c(7)), stock: num(c(8)),
            description: str(c(11), ""), gender: str(c(4), "Unisex"), last_update: null, image_url: null,
            availability_status: ESTADOS_EXCEL[String(str(c(9), "disponible")).toLowerCase()] ?? "disponible",
            delivery_days: Math.round(num(c(10))),
        })),
        inventario: filas("Inventario Gráfico").map(c => ({
            id: str(c(1)), name: str(c(2)), type: str(c(3)), category: str(c(4)), qty: num(c(5)),
            unit: str(c(6), "un."), last_update: str(c(7)), gender: null,
        })),
    };
}

function leerRespaldo(file) {
    if (!file) return {};
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const datos = raw.datos ?? raw;
    const out = {};
    for (const [tabla, mapear] of Object.entries(desdeApp)) {
        if (Array.isArray(datos[tabla]) && datos[tabla].length > 0) out[tabla] = datos[tabla].map(mapear);
    }
    return { tablas: out, fecha: raw.fecha, ignoradas: Object.keys(datos).filter(k => !(k in desdeApp)) };
}

// Quita filas sin clave y duplicados (se queda con la última aparición).
function limpiar(filas, clave = "id") {
    const porId = new Map();
    let sinId = 0;
    for (const f of filas) {
        if (!f[clave]) { sinId++; continue; }
        porId.set(f[clave], f);
    }
    return { filas: [...porId.values()], descartadas: filas.length - porId.size, sinId };
}

// ─── Principal ───────────────────────────────────────────────────
async function main() {
    const excel = await leerExcel(EXCEL);
    const respaldo = leerRespaldo(RESPALDO);
    const base = leerBase(BASE);

    console.log(`\nFuentes:`);
    console.log(`  Copia de base: ${BASE ? `${BASE} (${base.origen ?? "?"}, ${base.fecha?.slice(0, 10) ?? "?"})` : "(no se pasó --base)"}`);
    console.log(`  Respaldo:      ${RESPALDO ? `${RESPALDO}${respaldo.fecha ? ` (descargado ${respaldo.fecha.slice(0, 10)})` : ""}` : "(no se pasó --respaldo)"}`);
    console.log(`  Excel:         ${fs.existsSync(EXCEL) ? EXCEL : "(no encontrado)"}`);
    if (respaldo.ignoradas?.length) console.log(`  Claves del respaldo que no son tablas (se ignoran): ${respaldo.ignoradas.join(", ")}`);

    const plan = [];
    for (const tabla of Object.keys(COLUMNAS)) {
        // La copia de la base manda aunque la tabla esté vacía (es el estado real); las otras solo si tienen datos.
        const [origen, datos] =
            base.tablas?.[tabla] ? ["copia de base", base.tablas[tabla]] :
            respaldo.tablas?.[tabla]?.length ? ["respaldo", respaldo.tablas[tabla]] :
            excel[tabla]?.length ? ["Excel", excel[tabla]] :
            [null, []];
        const { filas, descartadas } = limpiar(datos, CLAVE[tabla] ?? "id");
        plan.push({ tabla, origen, filas, descartadas });
    }

    console.log(`\nQué se cargaría:`);
    for (const p of plan) {
        const extra = p.descartadas ? ` (${p.descartadas} descartadas por clave vacía o repetida)` : "";
        console.log(`  ${p.tabla.padEnd(22)} ${String(p.filas.length).padStart(5)}  ${p.origen ? `desde ${p.origen}` : "— sin datos"}${extra}`);
    }

    if (!APLICAR) {
        console.log(`\nModo prueba: no se escribió nada. Para cargar de verdad, agregá --aplicar.\n`);
        return;
    }

    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL (en .env.local o como variable de entorno) con la dirección de la base nueva.");
    if (url.includes("xata.tech")) throw new Error("DATABASE_URL todavía apunta a Xata. Poné la dirección de la base nueva antes de migrar.");

    const sql = postgres(url, { ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require", onnotice: () => {}, max: 1 });
    try {
        console.log(`\nCreando tablas...`);
        await sql.unsafe(fs.readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"));

        await sql.begin(async tx => {
            for (const { tabla, filas } of plan) {
                if (filas.length === 0) continue;
                const jsonCols = JSON_COLUMNS[tabla] ?? [];
                const rows = filas.map(f => {
                    const r = { ...f };
                    for (const c of jsonCols) r[c] = tx.json(r[c] ?? []);
                    return r;
                });
                const clave = CLAVE[tabla] ?? "id";
                const cols = Object.keys(filas[0]);
                const update = cols.filter(c => c !== clave);
                for (let i = 0; i < rows.length; i += 200) {
                    await tx`
                        INSERT INTO ${tx(tabla)} ${tx(rows.slice(i, i + 200), cols)}
                        ON CONFLICT (${tx(clave)}) DO UPDATE SET ${tx.unsafe(update.map(c => `"${c}" = EXCLUDED."${c}"`).join(", "))}
                    `;
                }
                const [{ n }] = await tx`SELECT count(*)::int AS n FROM ${tx(tabla)}`;
                console.log(`  ${tabla.padEnd(22)} ${String(n).padStart(5)} filas en la base`);
            }
            // Las solicitudes nuevas tienen que seguir la numeración desde el último id cargado.
            await tx`SELECT setval(pg_get_serial_sequence('solicitudes_mayorista', 'id'), GREATEST(COALESCE((SELECT max(id) FROM solicitudes_mayorista), 0), 1))`;
        });
        console.log(`\nListo. Migración terminada.\n`);
    } finally {
        await sql.end();
    }
}

main().catch(err => {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
});
