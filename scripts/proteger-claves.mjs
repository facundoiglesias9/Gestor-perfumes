// Cifra las contraseñas que todavía están guardadas tal cual en la tabla usuarios.
// La página ya cifra la de cada persona cuando entra; esto hace lo mismo con todas de una vez
// (incluidas las cuentas viejas de clientes, que ya no entran pero seguían con su clave a la vista).
//
// Uso:
//   node scripts/proteger-claves.mjs             -> modo prueba: solo cuenta cuántas faltan
//   node scripts/proteger-claves.mjs --aplicar   -> las cifra
//
// No se puede deshacer (el cifrado no tiene vuelta atrás), pero nadie pierde el acceso:
// cada persona sigue entrando con la misma contraseña de siempre.

import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";
import { cifrarClave, estaCifrada } from "./claves.mjs";

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
    const usuarios = await sql`select id, password from usuarios where password is not null and password <> ''`;
    const pendientes = usuarios.filter(u => !estaCifrada(u.password));
    console.log(`Usuarios con contraseña: ${usuarios.length} · sin cifrar: ${pendientes.length}`);

    if (!APLICAR) {
        console.log(pendientes.length ? "Modo prueba: no se cambió nada. Corré con --aplicar para cifrarlas." : "No hay nada para cifrar.");
    } else {
        await sql.begin(async (tx) => {
            for (const u of pendientes) {
                // "and password = ..." evita pisar una clave que alguien cambió mientras corría esto
                await tx`update usuarios set password = ${cifrarClave(u.password)} where id = ${u.id} and password = ${u.password}`;
            }
        });
        console.log(`Listo: ${pendientes.length} contraseñas cifradas.`);
    }
} catch (err) {
    console.error("No se pudo terminar:", err.message || err);
    process.exitCode = 1;
} finally {
    await sql.end();
}
