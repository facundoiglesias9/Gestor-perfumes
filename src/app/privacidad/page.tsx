import type { Metadata } from "next";
import PaginaLegal, { SeccionLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
    title: "Política de privacidad | Scenta",
    description: "Qué datos usa Scenta, para qué y cómo podés pedir que los corrijamos o borremos.",
};

const SECCIONES: SeccionLegal[] = [
    {
        titulo: "Mirar el catálogo no requiere datos",
        contenido: (
            <p>
                El catálogo no tiene cuentas de usuario, registro ni formularios. Podés ver los productos y precios sin
                darnos ningún dato personal.
            </p>
        ),
    },
    {
        titulo: "Tu pedido queda en tu dispositivo",
        contenido: (
            <>
                <p>
                    Lo que agregás a “Mi pedido” se guarda solo en tu navegador, para que no lo pierdas si cerrás la página.
                    <strong> Esa información no nos llega</strong> hasta que vos decidís enviarnos el pedido por WhatsApp.
                </p>
                <p>
                    Para borrarlo, quitá los productos de “Mi pedido” o borrá los datos de navegación de este sitio.
                </p>
            </>
        ),
    },
    {
        titulo: "Cookies",
        contenido: (
            <p>
                No usamos cookies de publicidad ni herramientas que sigan lo que hacés en el sitio. Las tipografías se cargan
                desde Google Fonts y el sitio está alojado en Vercel; como en cualquier página web, esos servicios reciben
                datos técnicos de la conexión (por ejemplo, tu dirección IP) para poder funcionar.
            </p>
        ),
    },
    {
        titulo: "Lo que nos compartís por WhatsApp",
        contenido: (
            <>
                <p>
                    Cuando nos escribís, recibimos tu nombre y número de WhatsApp, el pedido y, si hace falta para la entrega,
                    tu dirección. Usamos esos datos únicamente para responderte, preparar el pedido, coordinar el pago y el envío.
                </p>
                <p>
                    Registramos tus pedidos en nuestro sistema interno de gestión, al que solo accede el equipo de Scenta.
                </p>
            </>
        ),
    },
    {
        titulo: "No vendemos tus datos",
        contenido: (
            <p>
                No vendemos, alquilamos ni cedemos tu información. Solo compartimos lo indispensable con quien hace la
                entrega (por ejemplo, tu nombre y dirección con el servicio de envío).
            </p>
        ),
    },
    {
        titulo: "Servicios de terceros",
        contenido: (
            <p>
                WhatsApp y el banco o la billetera virtual que uses para transferir tienen sus propias políticas de privacidad,
                que se aplican cuando usás esos servicios.
            </p>
        ),
    },
    {
        titulo: "Cuánto tiempo guardamos tus datos",
        contenido: (
            <p>
                Mientras sean necesarios para gestionar tus pedidos y cumplir con nuestras obligaciones legales, por ejemplo
                las contables. Después los borramos.
            </p>
        ),
    },
    {
        titulo: "Tus derechos",
        contenido: (
            <>
                <p>
                    Podés pedirnos en cualquier momento <strong>ver, corregir o borrar</strong> los datos que nos compartiste,
                    escribiéndonos por WhatsApp. Te respondemos sin costo.
                </p>
                <p>
                    Tenés derecho a acceder a tus datos en forma gratuita a intervalos no inferiores a seis meses, salvo que
                    acredites un interés legítimo (artículo 14, inciso 3 de la Ley 25.326 de Protección de Datos Personales).
                    La{" "}
                    <a href="https://www.argentina.gob.ar/aaip/datospersonales" target="_blank" rel="noopener noreferrer">
                        Agencia de Acceso a la Información Pública
                    </a>
                    , órgano de control de esa ley, atiende las denuncias y reclamos por incumplimientos de las normas sobre
                    protección de datos personales.
                </p>
            </>
        ),
    },
    {
        titulo: "Cambios en esta política",
        contenido: (
            <p>
                Si cambiamos la forma en que usamos tus datos, vamos a actualizar esta página y la fecha de arriba.
            </p>
        ),
    },
];

export default function PrivacidadPage() {
    return (
        <PaginaLegal
            actual="/privacidad"
            titulo="Política de privacidad"
            actualizacion="13 de octubre de 2026"
            intro={
                <p>
                    Te contamos qué datos usamos, para qué y cómo podés pedirnos que los corrijamos o borremos. Corto y sin
                    letra chica.
                </p>
            }
            secciones={SECCIONES}
        />
    );
}
