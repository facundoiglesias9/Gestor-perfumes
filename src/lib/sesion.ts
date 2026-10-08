import crypto from "node:crypto";
import { cookies } from "next/headers";
import sql from "./db";

// Sesión del sistema interno: una cookie firmada por el servidor que el navegador no puede
// leer ni modificar (httpOnly). Antes la sesión era un dato en el navegador que cualquiera
// podía escribir a mano para hacerse pasar por administrador.

const COOKIE = "scenta_sesion";
const DURACION_DIAS = 30;

export type UsuarioSesion = {
    id: string;
    username: string;
    role: string;
    status: string;
    lastLogin?: string;
};

// La firma usa SESSION_SECRET si está configurada; si no, se deriva de DATABASE_URL,
// que ya es secreta y solo existe en el servidor.
function secreto(): Buffer {
    const base = process.env.SESSION_SECRET || process.env.DATABASE_URL;
    if (!base) throw new Error("Falta SESSION_SECRET o DATABASE_URL para firmar sesiones.");
    return crypto.createHash("sha256").update(`scenta-sesion|${base}`).digest();
}

const firmar = (datos: string) => crypto.createHmac("sha256", secreto()).update(datos).digest("base64url");

function armarToken(uid: string): string {
    const datos = Buffer.from(JSON.stringify({ uid, exp: Date.now() + DURACION_DIAS * 86_400_000 })).toString("base64url");
    return `${datos}.${firmar(datos)}`;
}

function leerToken(token: string | undefined): string | null {
    if (!token) return null;
    const [datos, firma] = token.split(".");
    if (!datos || !firma) return null;
    const esperada = Buffer.from(firmar(datos));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
    try {
        const { uid, exp } = JSON.parse(Buffer.from(datos, "base64url").toString());
        return typeof uid === "string" && typeof exp === "number" && exp > Date.now() ? uid : null;
    } catch {
        return null;
    }
}

export async function abrirSesion(uid: string) {
    (await cookies()).set(COOKIE, armarToken(uid), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: DURACION_DIAS * 86_400,
    });
}

export async function cerrarSesionCookie() {
    (await cookies()).delete(COOKIE);
}

// Quién está usando el sistema. Se vuelve a mirar la base en cada consulta: si alguien
// fue desactivado, deja de tener acceso aunque su cookie siga vigente.
export async function usuarioActual(): Promise<UsuarioSesion | null> {
    const uid = leerToken((await cookies()).get(COOKIE)?.value);
    if (!uid) return null;
    const filas = await sql`select id, username, role, status, last_login from usuarios where id = ${uid}`;
    const u = filas[0];
    if (!u || u.status === "Inactivo") return null;
    return { id: u.id, username: u.username, role: u.role, status: u.status, lastLogin: u.last_login ?? undefined };
}

export async function esAdmin(): Promise<boolean> {
    try {
        return (await usuarioActual())?.role === "admin";
    } catch {
        return false;
    }
}
