// Carga en la base las notas de los perfumes (db/notas-perfumes.json), en una tabla aparte
// de los productos: una fila por perfume, la usan todos sus tamaños.
// Solo carga las de confianza alta o media; las dudosas quedan en el archivo sin publicar.
// Uso: node scripts/cargar-notas.mjs   (lee DATABASE_URL de .env.local)
import fs from "fs";
import { createRequire } from "module";

const postgres = createRequire(import.meta.url)("postgres");
const env = Object.fromEntries(
    fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
        .filter(l => /^\w+=/.test(l))
        .map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; })
);
const url = process.env.DATABASE_URL || env.DATABASE_URL;
const sql = postgres(url, { ssl: /@(localhost|127\.0\.0\.1)/.test(url) ? false : "require", onnotice: () => {} });

const notas = JSON.parse(fs.readFileSync("db/notas-perfumes.json", "utf8"))
    .filter(n => n.confianza === "alta" || n.confianza === "media");

await sql`
    CREATE TABLE IF NOT EXISTS perfume_notas (
        slug        text PRIMARY KEY,
        original    text,
        familia     text[] DEFAULT '{}',
        salida      text,
        corazon     text,
        fondo       text,
        descripcion text,
        updated_at  timestamptz DEFAULT now()
    )
`;

for (const n of notas) {
    await sql`
        INSERT INTO perfume_notas (slug, original, familia, salida, corazon, fondo, descripcion, updated_at)
        VALUES (${n.slug}, ${n.original}, ${n.familia}, ${n.salida}, ${n.corazon}, ${n.fondo}, ${n.descripcion}, now())
        ON CONFLICT (slug) DO UPDATE SET
            original = EXCLUDED.original, familia = EXCLUDED.familia, salida = EXCLUDED.salida,
            corazon = EXCLUDED.corazon, fondo = EXCLUDED.fondo, descripcion = EXCLUDED.descripcion, updated_at = now()
    `;
}
const [{ total }] = await sql`SELECT count(*)::int AS total FROM perfume_notas`;
console.log(`Cargadas ${notas.length} notas. La tabla tiene ${total} perfumes.`);
await sql.end();
