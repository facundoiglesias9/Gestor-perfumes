// Crea un usuario administrador (entra al sistema interno con la misma vista que el dueño),
// o le pone una contraseña nueva si ya existe: sirve si alguien se olvidó la suya o si
// nadie del equipo puede entrar. Normalmente esto se hace desde Mi perfil, en la página.
//
// Uso:
//   node scripts/crear-admin.mjs <usuario>        -> usa DATABASE_URL de .env.local
//
// La contraseña se pide por teclado (no se muestra ni queda en el historial de la terminal)
// y se guarda cifrada, igual que desde la página.

import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";
import { cifrarClave } from "./claves.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const usuario = (process.argv[2] || "").trim().toLowerCase();
if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    console.error("Uso: node scripts/crear-admin.mjs <usuario>   (3 a 30 letras, números, punto o guion)");
    process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
}

// Pregunta por teclado; con oculto=true no se ve lo que se escribe
function preguntar(texto, oculto = false) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        let mudo = false;
        rl._writeToOutput = (s) => { if (!mudo) rl.output.write(s); };
        rl.question(texto, (respuesta) => {
            rl.close();
            if (oculto) process.stdout.write("\n");
            resolve(respuesta);
        });
        mudo = oculto;
    });
}

const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const sql = postgres(url, { ssl: isLocal ? false : "require", onnotice: () => {}, max: 1 });

try {
    const existentes = await sql`select id, role from usuarios where lower(username) = ${usuario}`;
    const existente = existentes[0];
    if (existente) {
        const cambiar = await preguntar(`Ya existe "${usuario}". ¿Querés ponerle una contraseña nueva? (s/n): `);
        if (cambiar.trim().toLowerCase() !== "s") {
            console.log("No se cambió nada.");
            process.exit(0);
        }
    }

    const clave = await preguntar(`Contraseña para "${usuario}": `, true);
    if (clave.length < 8) {
        console.error("La contraseña tiene que tener al menos 8 caracteres. No se creó nada.");
        process.exit(1);
    }
    const repetida = await preguntar("Repetila: ", true);
    if (repetida !== clave) {
        console.error("Las contraseñas no coinciden. No se creó nada.");
        process.exit(1);
    }

    if (existente) {
        await sql`update usuarios set password = ${cifrarClave(clave)} where id = ${existente.id}`;
        console.log(`Listo: "${usuario}" ya puede entrar con la contraseña nueva.`);
        process.exit(0);
    }

    const ok = await preguntar(`Se va a crear "${usuario}" como administrador (ve todo el sistema). ¿Confirmás? (s/n): `);
    if (ok.trim().toLowerCase() !== "s") {
        console.log("Cancelado. No se creó nada.");
        process.exit(0);
    }

    // Mismo formato de id que los usuarios que ya existen (9 caracteres al azar)
    const id = crypto.randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 9);
    await sql`
        insert into usuarios (id, username, password, role, status)
        values (${id}, ${usuario}, ${cifrarClave(clave)}, 'admin', 'Activo')
    `;
    console.log(`Listo: "${usuario}" ya puede entrar al sistema con su contraseña.`);
} catch (err) {
    console.error("No se pudo crear el usuario:", err.message || err);
    process.exitCode = 1;
} finally {
    await sql.end();
}
