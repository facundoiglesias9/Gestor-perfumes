// Exporta todas las tablas de la base a un archivo JSON (copia de seguridad completa).
//
// Uso:
//   node scripts/exportar-base.mjs                 -> usa DATABASE_URL de .env.local
//   node scripts/exportar-base.mjs --salida dir    -> carpeta de destino (por defecto: respaldos/)
//
// El archivo incluye usuarios y contraseñas: guardalo en un lugar seguro y no lo subas a git.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const args = process.argv.slice(2);
const i = args.indexOf("--salida");
const SALIDA = i >= 0 ? path.resolve(args[i + 1]) : path.join(ROOT, "respaldos");

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const sql = postgres(url, { ssl: isLocal ? false : "require", onnotice: () => {}, max: 1 });

try {
    const host = new URL(url).hostname;
    const tablas = await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE 'pg\\_%'
        ORDER BY table_name
    `;
    const columnas = await sql`
        SELECT table_name, column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' ORDER BY table_name, ordinal_position
    `;

    const respaldo = { origen: host, fecha: new Date().toISOString(), esquema: {}, datos: {} };
    for (const c of columnas) (respaldo.esquema[c.table_name] ??= []).push({ columna: c.column_name, tipo: c.data_type });

    console.log(`\nExportando desde ${host}...`);
    for (const { table_name } of tablas) {
        const filas = await sql`SELECT * FROM ${sql(table_name)}`;
        respaldo.datos[table_name] = filas.map(f => ({ ...f }));
        console.log(`  ${table_name.padEnd(24)} ${String(filas.length).padStart(6)} filas`);
    }

    fs.mkdirSync(SALIDA, { recursive: true });
    const archivo = path.join(SALIDA, `respaldo-base-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(archivo, JSON.stringify(respaldo, null, 1));
    const mb = (fs.statSync(archivo).size / 1024 / 1024).toFixed(1);
    console.log(`\nListo: ${archivo} (${mb} MB)\n`);
} catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exitCode = 1;
} finally {
    await sql.end();
}
