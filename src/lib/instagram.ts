// Conexión con la cuenta de Instagram del negocio, para el agente de Marketing.
// Usa la API de Instagram con inicio de sesión de Instagram (cuentas profesionales: Empresa o
// Creador). Solo lee: perfil, seguidores y las últimas publicaciones con sus me gusta y comentarios.
//
// Se conecta cargando la variable de entorno IG_ACCESS_TOKEN (en .env.local y en Vercel).
// El token nunca sale del servidor. Si no está o falla, el agente funciona igual sin Instagram.
// Solo lo usan las acciones de servidor que ya chequearon la sesión de administrador.
import type { DatosInstagram } from './agentes-tipos';

const API = 'https://graph.instagram.com';

export const instagramConfigurado = () => !!process.env.IG_ACCESS_TOKEN;

export async function leerInstagram(): Promise<DatosInstagram | null> {
    const token = process.env.IG_ACCESS_TOKEN;
    if (!token) return null;
    try {
        const pedir = async (ruta: string, campos: string) => {
            const url = `${API}/${ruta}?fields=${campos}&access_token=${encodeURIComponent(token)}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
            if (!res.ok) throw new Error(`Instagram respondió ${res.status}`);
            return res.json();
        };
        const [perfil, media] = await Promise.all([
            pedir('me', 'username,followers_count,media_count'),
            pedir('me/media', 'caption,media_type,timestamp,like_count,comments_count,permalink&limit=20'),
        ]);
        return {
            usuario: String(perfil?.username ?? ''),
            seguidores: Number(perfil?.followers_count) || 0,
            publicaciones: Number(perfil?.media_count) || 0,
            ultimas: (Array.isArray(media?.data) ? media.data : []).map((m: Record<string, unknown>) => ({
                tipo: String(m.media_type ?? ''),
                texto: String(m.caption ?? '').slice(0, 140),
                fecha: String(m.timestamp ?? ''),
                meGusta: Number(m.like_count) || 0,
                comentarios: Number(m.comments_count) || 0,
                link: String(m.permalink ?? ''),
            })),
        };
    } catch (err) {
        // Sin el token en el mensaje: solo el motivo
        console.error('Instagram:', err instanceof Error ? err.message : 'error');
        return null;
    }
}
