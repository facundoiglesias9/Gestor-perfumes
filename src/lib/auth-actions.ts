'use server'

import crypto from "node:crypto";
import sql from "./db";
import { cifrarClave, revisarClave } from "./claves";
import { abrirSesion, cerrarSesionCookie, usuarioActual, type UsuarioSesion } from "./sesion";
import { GOOGLE_CLIENT_ID } from "./google";

// Ingreso y manejo de usuarios del equipo. Todo pasa en el servidor: el navegador nunca
// recibe contraseñas (ni cifradas) y no puede elegir quién es.

const SOLO_EQUIPO = "Este acceso es solo para el equipo de Scenta. Para comprar, mirá nuestro catálogo.";
const USUARIO_VALIDO = /^[a-z0-9._-]{3,30}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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

// Ingreso con Google: el navegador manda el aviso firmado que le dio Google y acá se le pregunta
// a Google si es válido. Solo entra un administrador activo que tenga ese mail cargado en su usuario;
// nunca se crea un usuario nuevo.
export async function iniciarSesionConGoogle(credencial: string): Promise<Resultado<UsuarioSesion>> {
    const token = String(credencial || "");
    const noSePudo = { ok: false as const, error: "No se pudo comprobar tu cuenta de Google. Probá de nuevo." };
    if (!token || token.length > 4096) return noSePudo;
    try {
        const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!r.ok) {
            await esperar(600);
            return noSePudo;
        }
        const info = await r.json();
        const valido = info.aud === GOOGLE_CLIENT_ID
            && (info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com")
            && (info.email_verified === true || info.email_verified === "true")
            && Number(info.exp) * 1000 > Date.now()
            && typeof info.email === "string";
        if (!valido) {
            await esperar(600);
            return noSePudo;
        }

        const email = info.email.trim().toLowerCase();
        const filas = await sql`select id, username, role, status from usuarios where lower(email) = ${email}`;
        const u = filas.find(f => f.role === "admin") ?? filas[0];
        if (!u) {
            await esperar(600);
            return { ok: false, error: `${email} no tiene acceso. Pedile a alguien del equipo que la agregue en Mi perfil, o ingresá con tu usuario y contraseña.` };
        }
        if (u.status === "Inactivo") return { ok: false, error: "Tu cuenta está inactiva. Contactá al administrador." };
        if (u.role !== "admin") return { ok: false, error: SOLO_EQUIPO };

        await sql`update usuarios set last_login = ${hoy()} where id = ${u.id}`;
        await abrirSesion(u.id);
        return { ok: true, dato: { id: u.id, username: u.username, role: u.role, status: u.status, lastLogin: hoy() } };
    } catch (err) {
        console.error("Error al iniciar sesión con Google:", err);
        return { ok: false, error: "No se pudo conectar. Probá de nuevo en un momento." };
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

// Revisa el formato del correo y que no lo tenga otra persona del equipo
// (si dos usuarios tuvieran el mismo, el ingreso con Google no sabría a cuál entrar).
async function revisarCorreo(correo: string, idPropio: string | null): Promise<string | null> {
    if (!CORREO_VALIDO.test(correo) || correo.length > 254) return "Ese correo no parece válido. Revisalo (ej: nombre@gmail.com).";
    const usado = await sql`
        select username from usuarios
        where role = 'admin' and lower(email) = ${correo} and id is distinct from ${idPropio}
    `;
    return usado.length ? `Ese correo ya lo usa "${usado[0].username}".` : null;
}

// Con Gmail la contraseña es opcional: esa persona entra con "Continuar con Google".
export async function crearUsuarioEquipo(usuario: string, clave: string, gmail = ""): Promise<Resultado<UsuarioSesion>> {
    if (!(await exigirAdmin())) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };

    const nombre = String(usuario || "").trim().toLowerCase();
    const correo = String(gmail || "").trim().toLowerCase();
    const conClave = String(clave || "").length > 0;
    if (!USUARIO_VALIDO.test(nombre)) return { ok: false, error: "El usuario tiene que tener entre 3 y 30 caracteres: letras, números, punto o guion, sin espacios." };
    if (!conClave && !correo) return { ok: false, error: "Poné una contraseña o un Gmail para que pueda entrar." };
    if (conClave && clave.length < MIN_CLAVE) return { ok: false, error: `La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.` };

    try {
        const existe = await sql`select 1 from usuarios where lower(username) = ${nombre}`;
        if (existe.length > 0) return { ok: false, error: `Ya existe un usuario "${nombre}". Elegí otro nombre.` };
        if (correo) {
            const problema = await revisarCorreo(correo, null);
            if (problema) return { ok: false, error: problema };
        }

        const id = crypto.randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 9);
        await sql`
            insert into usuarios (id, username, email, password, role, status)
            values (${id}, ${nombre}, ${correo || null}, ${conClave ? await cifrarClave(clave) : null}, 'admin', 'Activo')
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

// Vincula, cambia o quita (correo vacío) la cuenta de Google con la que alguien del equipo puede entrar.
export async function cambiarGmailUsuario(id: string, gmail: string): Promise<Resultado> {
    if (!(await exigirAdmin())) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
    const correo = String(gmail || "").trim().toLowerCase();
    try {
        const [u] = await sql`select password is not null as con_clave from usuarios where id = ${id} and role = 'admin'`;
        if (!u) return { ok: false, error: "No se encontró ese usuario." };
        if (correo) {
            const problema = await revisarCorreo(correo, id);
            if (problema) return { ok: false, error: problema };
        } else if (!u.con_clave) {
            return { ok: false, error: "Este usuario entra solo con Google. Ponele una contraseña antes de quitarle el Gmail." };
        }
        await sql`update usuarios set email = ${correo || null} where id = ${id} and role = 'admin'`;
        return { ok: true };
    } catch (err) {
        console.error("Error al cambiar el Gmail:", err);
        return { ok: false, error: "No se pudo guardar el Gmail. Probá de nuevo." };
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

// Borra para siempre a alguien del equipo. Si tenía la sesión abierta, se le cierra sola
// en el próximo paso (cada consulta revisa que el usuario siga existiendo).
export async function eliminarUsuario(id: string): Promise<Resultado> {
    const yo = await exigirAdmin();
    if (!yo) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." };
    if (yo.id === id) return { ok: false, error: "No podés eliminarte a vos mismo." };
    try {
        const [{ n }] = await sql`select count(*)::int n from usuarios where role = 'admin' and coalesce(status, 'Activo') <> 'Inactivo' and id <> ${id}`;
        if (n === 0) return { ok: false, error: "Tiene que quedar al menos un usuario que pueda entrar." };
        const res = await sql`delete from usuarios where id = ${id} and role = 'admin' returning username`;
        return res.length ? { ok: true } : { ok: false, error: "No se encontró ese usuario." };
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        return { ok: false, error: "No se pudo eliminar el usuario. Probá de nuevo." };
    }
}
