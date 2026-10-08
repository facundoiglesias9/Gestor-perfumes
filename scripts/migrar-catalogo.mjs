// Prepara la base para la página Catálogo: elegir qué productos se ven y guardar sus fotos.
// Solo agrega (no borra ni cambia nada existente) y se puede correr más de una vez.
//
// Uso:
//   node scripts/migrar-catalogo.mjs             -> modo prueba: muestra qué falta
//   node scripts/migrar-catalogo.mjs --aplicar   -> lo crea

import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const APLICAR = process.argv.includes("--aplicar");
const url = process.env.DATABASE_URL;
if (!url) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const sql = postgres(url, { ssl: isLocal ? false : "require", onnotice: () => {}, max: 1 });

try {
    const [{ hayColumna }] = await sql`
        select exists (select 1 from information_schema.columns
                       where table_name = 'productos' and column_name = 'visible_catalogo') as "hayColumna"`;
    const [{ hayTabla }] = await sql`
        select exists (select 1 from information_schema.tables where table_name = 'producto_fotos') as "hayTabla"`;

    console.log(`Columna productos.visible_catalogo: ${hayColumna ? "ya existe" : "falta"}`);
    console.log(`Tabla producto_fotos: ${hayTabla ? "ya existe" : "falta"}`);

    if (!APLICAR) {
        console.log("Modo prueba: no se cambió nada. Corré con --aplicar para crearlo.");
    } else {
        await sql.begin(async (tx) => {
            // Todos arrancan visibles: el catálogo se ve igual que antes hasta que se oculte algo
            await tx`alter table productos add column if not exists visible_catalogo boolean not null default true`;
            // Una foto por producto, ya achicada en el navegador antes de subirla
            await tx`
                create table if not exists producto_fotos (
                    producto_id text primary key,
                    tipo text not null,
                    datos bytea not null,
                    actualizado timestamptz not null default now()
                )`;
        });
        console.log("Listo.");
    }
} catch (err) {
    console.error("No se pudo terminar:", err.message || err);
    process.exitCode = 1;
} finally {
    await sql.end();
}
