// Prepara la base para la página Notas: antes las notas vivían solo en el navegador y se
// perdían al cambiar de compu, de navegador o al borrar los datos de navegación.
// Solo agrega (no borra ni cambia nada existente) y se puede correr más de una vez.
//
// Uso:
//   node scripts/migrar-notas.mjs             -> modo prueba: muestra qué falta
//   node scripts/migrar-notas.mjs --aplicar   -> lo crea

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
    const [{ hayTabla }] = await sql`
        select exists (select 1 from information_schema.tables where table_name = 'notas') as "hayTabla"`;

    console.log(`Tabla notas: ${hayTabla ? "ya existe" : "falta"}`);

    if (!APLICAR) {
        console.log("Modo prueba: no se cambió nada. Corré con --aplicar para crearla.");
    } else {
        await sql.begin(async (tx) => {
            // Cada nota es de un usuario: solo la ve quien la escribió
            await tx`
                create table if not exists notas (
                    id text primary key,
                    usuario_id text not null,
                    texto text not null default '',
                    color text not null default 'salvia',
                    fijada boolean not null default false,
                    creada timestamptz not null default now(),
                    editada timestamptz not null default now()
                )`;
            await tx`create index if not exists notas_usuario_idx on notas (usuario_id, creada desc)`;
        });
        console.log("Listo: tabla notas creada.");
    }
} finally {
    await sql.end();
}
