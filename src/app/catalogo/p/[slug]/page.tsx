import type { Metadata } from "next";
import CatalogoClient from "../../CatalogoClient";
import { getProductosPublicos, getMasPedidos, getNotasPerfumes } from "@/lib/catalogo-datos";
import { agruparPorPerfume, nombreYMarca, mlDe } from "@/lib/catalogo-perfume";
import { formatNumber } from "@/lib/format-utils";

// Link para compartir un perfume: muestra el catálogo con la ficha de ese perfume ya abierta,
// y al mandarlo por WhatsApp o Instagram la vista previa trae su nombre, precio y foto.
export const revalidate = 300;

// Dirección pública del sitio (Vercel la da sola); en la compu, localhost
const SITIO = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const tamanos = agruparPorPerfume(await getProductosPublicos() ?? []).get(slug);
    if (!tamanos) return { title: "Catálogo | Scenta" };

    const { nombre, marca } = nombreYMarca(tamanos[0].name);
    const precios = tamanos.map(p => `${mlDe(p) ? `${mlDe(p)} ml ` : ""}$${formatNumber(p.price)}`).join(" · ");
    const titulo = `${nombre}${marca ? ` · ${marca}` : ""} | Scenta`;
    // La vista previa del link suma la descripción del perfume si tiene notas cargadas
    const resumen = (await getNotasPerfumes())[slug]?.descripcion;
    const descripcion = `${resumen ? `${resumen} ` : ""}${tamanos[0].gender} · ${precios}. Pedilo por WhatsApp.`;
    const foto = tamanos.find(p => p.foto)?.foto ?? "/logo-scenta.png";

    return {
        metadataBase: new URL(SITIO),
        title: titulo,
        description: descripcion,
        alternates: { canonical: `/catalogo/p/${slug}` },
        openGraph: { title: titulo, description: descripcion, images: [foto], url: `/catalogo/p/${slug}`, siteName: "Scenta", type: "website" },
        twitter: { card: "summary", title: titulo, description: descripcion, images: [foto] },
    };
}

export default async function PerfumePage({ params }: Props) {
    const { slug } = await params;
    const [productos, masPedidos, notas] = await Promise.all([getProductosPublicos(), getMasPedidos(), getNotasPerfumes()]);
    return <CatalogoClient productos={productos} masPedidos={masPedidos} notas={notas} perfumeInicial={slug} />;
}
