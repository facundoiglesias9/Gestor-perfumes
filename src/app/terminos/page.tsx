import type { Metadata } from "next";
import PaginaLegal, { SeccionLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
    title: "Términos y condiciones | Scenta",
    description: "Cómo funcionan los pedidos, precios, envíos, cambios y devoluciones de Scenta.",
};

const SECCIONES: SeccionLegal[] = [
    {
        titulo: "Nuestros productos",
        contenido: (
            <>
                <p>
                    Scenta elabora perfumes, difusores y aromas para el auto a partir de esencias seleccionadas.
                    Cada producto indica su tamaño o formato y, en el caso de los perfumes, si es femenino, masculino o unisex.
                </p>
                <p>
                    Cuando un producto menciona el nombre de un perfume o de una marca conocida, lo hace solo como referencia
                    para que te des una idea del estilo del aroma. <strong>No vendemos perfumes originales de esas marcas</strong> ni
                    tenemos relación con ellas: las marcas mencionadas pertenecen a sus respectivos dueños.
                </p>
            </>
        ),
    },
    {
        titulo: "Precios",
        contenido: (
            <p>
                Los precios están en pesos argentinos (ARS) e incluyen impuestos. Pueden cambiar sin previo aviso.
                El total que ves en “Mi pedido” es estimado: el precio que vale es el que te confirmamos por WhatsApp
                al cerrar tu compra.
            </p>
        ),
    },
    {
        titulo: "Cómo se hace un pedido",
        contenido: (
            <>
                <p>
                    En el catálogo elegís los productos y nos enviás el pedido por WhatsApp. Mandar ese mensaje
                    <strong> no te obliga a comprar</strong>: es una consulta.
                </p>
                <p>
                    El pedido queda confirmado cuando te respondemos con la disponibilidad, el precio final, la forma de pago
                    y el envío, y vos nos das el visto bueno.
                </p>
            </>
        ),
    },
    {
        titulo: "Disponibilidad y demoras",
        contenido: (
            <p>
                La disponibilidad que muestra el catálogo es orientativa y puede cambiar durante el día. Algunos productos se
                preparan a pedido: en ese caso lo indicamos en el producto (“Entrega en X días”) y te confirmamos el plazo antes
                de cerrar la compra.
            </p>
        ),
    },
    {
        titulo: "Pagos",
        contenido: (
            <p>
                Podés pagar en efectivo o por transferencia. Te pasamos los datos por WhatsApp una vez confirmado
                el pedido. Nunca te vamos a pedir contraseñas ni datos de tu tarjeta por mensaje.
            </p>
        ),
    },
    {
        titulo: "Envíos y entregas",
        contenido: (
            <p>
                Coordinamos la entrega o el envío por WhatsApp. Antes de confirmar te informamos el costo y el plazo
                según tu zona.
            </p>
        ),
    },
    {
        titulo: "Derecho de arrepentimiento",
        contenido: (
            <>
                <p>
                    Como es una compra a distancia, tenés <strong>10 días corridos</strong> desde que recibís el producto para
                    arrepentirte, sin tener que explicar el motivo (artículo 34 de la Ley 24.240 de Defensa del Consumidor).
                </p>
                <p>
                    Para hacerlo, avisanos por WhatsApp y dejá el producto a nuestra disposición en las mismas condiciones en
                    que lo recibiste. Los gastos de devolución corren por nuestra cuenta y te reintegramos lo que pagaste.
                </p>
            </>
        ),
    },
    {
        titulo: "Productos con fallas",
        contenido: (
            <p>
                Si tu producto llega roto, con pérdidas o no es el que pediste, escribinos apenas lo recibas, si podés con una
                foto. Lo cambiamos o te devolvemos el dinero, como prefieras.
            </p>
        ),
    },
    {
        titulo: "Uso y cuidados",
        contenido: (
            <>
                <p>
                    Nuestros productos son de uso externo. Si tenés la piel sensible, probá primero en una zona pequeña; si notás
                    irritación, dejá de usarlo.
                </p>
                <p>
                    Contienen alcohol: guardalos lejos del fuego y de fuentes de calor, y fuera del alcance de chicos y mascotas.
                    No se deben ingerir. Los difusores y aromas para el auto son para perfumar ambientes, no para la piel.
                </p>
            </>
        ),
    },
    {
        titulo: "Fotos e información",
        contenido: (
            <p>
                Las fotos son ilustrativas: los colores pueden verse distintos según la pantalla y la presentación puede
                cambiar levemente entre partidas. Si tenés dudas sobre un producto, consultanos antes de comprar.
            </p>
        ),
    },
    {
        titulo: "Contenido del sitio",
        contenido: (
            <p>
                El nombre Scenta, el logo, las fotos y los textos de este sitio son nuestros. No los uses con fines comerciales
                sin nuestro permiso.
            </p>
        ),
    },
    {
        titulo: "Cambios en estos términos",
        contenido: (
            <p>
                Podemos actualizar estos términos cuando cambie la forma en que trabajamos. Para cada compra valen los términos
                publicados en el momento en que hiciste el pedido.
            </p>
        ),
    },
    {
        titulo: "Consultas y reclamos",
        contenido: (
            <>
                <p>
                    Ante cualquier consulta o reclamo, escribinos por WhatsApp y lo resolvemos.
                </p>
                <p>
                    Como consumidor, también podés acudir a{" "}
                    <a href="https://www.argentina.gob.ar/economia/industria-y-comercio/defensadelconsumidor" target="_blank" rel="noopener noreferrer">
                        Defensa del Consumidor
                    </a>.
                </p>
            </>
        ),
    },
];

export default function TerminosPage() {
    return (
        <PaginaLegal
            actual="/terminos"
            titulo="Términos y condiciones"
            actualizacion="13 de octubre de 2026"
            intro={
                <p>
                    Estas son las reglas para comprar en Scenta. Las escribimos simples para que sepas qué esperar de nosotros
                    y qué podés pedirnos. Al hacer un pedido, aceptás estos términos.
                </p>
            }
            secciones={SECCIONES}
        />
    );
}
