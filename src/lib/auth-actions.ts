'use server'

import crypto from "node:crypto";
import sql from "./db";
import { cifrarClave, revisarClave } from "./claves";
import { abrirSesion, cerrarSesionCookie, usuarioActual, type UsuarioSesion } from "./sesion";

// Ingreso y manejo de usuarios del equipo. Todo pasa en el servidor: el navegador nunca
// recibe contraseñas (ni cifradas) y no puede elegir quién es.

const SOLO_EQUIPO = "Este acceso es solo para el equipo de Scenta. Para comprar, mirá nuestro catálogo.";
const USUARIO_VALIDO = /^[a-z0-9._-]{3,30}$/;
const MIN_CLAVE = 8;

type Resultado<T = undefined> = { ok: true; dato?: T } | { ok: false; error: string };

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));
const hoy = () => new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

export async function iniciarSesion(usuario: string, clave: string): Promise<Resultado<UsuarioSesion>> {
    const nombre = String(usuario || "").trim().toLowerCase();
    try {
        const filas = await sql`select id, username, password, role, status from usuarios where lower(username) = ${nombre}`;
        const u = filas[0];
        const { ok, vieja } = await revisarClave(String(clave || ""), u?.password);

        if (!u || !ok) {
            // Una pausa corta en cada error hace muy lento probar contraseñas al azar
            await esperar(600);
            return { ok: false, error: "Usuario o contraseña incorrectos." };
        }
        if (u.status === "Inactivo") return { ok: false, error: "Tu cuenta está inactiva. Contactá al administrador." };
        if (u.role !== "admin") return { ok: false, error: SOLO_EQUIPO };

        // Si la contraseña estaba guardada sin cifrar, se cifra ahora que sabemos que es correcta
        if (vieja) {
            await sql`update usuarios set password = ${await cifrarClave(clave)}, last_login = ${hoy()} where id = ${u.id}`;
        } else {
            await sql`update usuarios set last_login = ${hoy()} where id = ${u.id}`;
        }

        await abrirSesion(u.id);
        return { ok: true, dato: { id: u.id, username: u.username, role: u.role, status: u.status, lastLogin: hoy() } };
    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        return { ok: false, error: "No se pudo conectar con la base. Probá de nuevo en un momento." };
    }
}

export async function cerrarSesion() {
    await cerrarSesionCookie();
}

export async function sesionActual(): Promise<UsuarioSesion | null> {
    try {
        return await usuarioActual();
    } catch (err) {
        console.error("Error al leer la sesión:", err);
        return null;
    }
}

async function exigirAdmin(): Promise<UsuarioSesion | null> {
    const yo = await sesionActual();
    return yo?.role === "admin" ? yo : null;
}

export async function crearUsuarioEquipo(usuario: string, clave: string): Promise<Resultado<UsuarioSesion>> {
    if (!(await exigirAdmin())) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };

    const nombre = String(usuario || "").trim().toLowerCase();
    if (!USUARIO_VALIDO.test(nombre)) return { ok: false, error: "El usuario tiene que tener entre 3 y 30 caracteres: letras, números, punto o guion, sin espacios." };
    if (String(clave || "").length < MIN_CLAVE) return { ok: false, error: `La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.` };

    try {
        const existe = await sql`select 1 from usuarios where lower(username) = ${nombre}`;
        if (existe.length > 0) return { ok: false, error: `Ya existe un usuario "${nombre}". Elegí otro nombre.` };

        const id = crypto.randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 9);
        await sql`
            insert into usuarios (id, username, password, role, status)
            values (${id}, ${nombre}, ${await cifrarClave(clave)}, 'admin', 'Activo')
        `;
        return { ok: true, dato: { id, username: nombre, role: "admin", status: "Activo" } };
    } catch (err) {
        console.error("Error al crear usuario:", err);
        return { ok: false, error: "No se pudo crear el usuario. Probá de nuevo." };
    }
}

export async function cambiarClaveUsuario(id: string, clave: string): Promise<Resultado> {
    if (!(await exigirAdmin())) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
    if (String(clave || "").length < MIN_CLAVE) return { ok: false, error: `La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.` };
    try {
        const res = await sql`update usuarios set password = ${await cifrarClave(clave)} where id = ${id} and role = 'admin' returning id`;
        return res.length ? { ok: true } : { ok: false, error: "No se encontró ese usuario." };
    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        return { ok: false, error: "No se pudo cambiar la contraseña. Probá de nuevo." };
    }
}

export async function cambiarEstadoUsuario(id: string, activo: boolean): Promise<Resultado> {
    const yo = await exigirAdmin();
    if (!yo) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
    if (yo.id === id) return { ok: false, error: "No podés desactivarte a vos mismo." };
    try {
        if (!activo) {
            const [{ n }] = await sql`select count(*)::int n from usuarios where role = 'admin' and coalesce(status, 'Activo') <> 'Inactivo' and id <> ${id}`;
            if (n === 0) return { ok: false, error: "Tiene que quedar al menos un usuario que pueda entrar." };
        }
        const res = await sql`update usuarios set status = ${activo ? "Activo" : "Inactivo"} where id = ${id} and role = 'admin' returning id`;
        return res.length ? { ok: true } : { ok: false, error: "No se encontró ese usuario." };
    } catch (err) {
        console.error("Error al cambiar estado de usuario:", err);
        return { ok: false, error: "No se pudo guardar el cambio. Probá de nuevo." };
    }
}
