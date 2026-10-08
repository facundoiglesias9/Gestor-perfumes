import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";

// Puerta de entrada del sitio: quien tiene sesión iniciada va al sistema interno;
// cualquier otra persona (un posible comprador) va al catálogo público.
// La sesión se lee de la cookie firmada en el servidor, sin cargar el resto de la base.
export const dynamic = "force-dynamic";

export default async function HomePage() {
    let conSesion = false;
    try {
        conSesion = (await usuarioActual())?.role === "admin";
    } catch { }
    redirect(conSesion ? "/lista-precios" : "/catalogo");
}
