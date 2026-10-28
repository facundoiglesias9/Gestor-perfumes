import type { Metadata } from "next";
import CatalogoClient from "./CatalogoClient";
import { getProductosPublicos, getMasPedidos, getNotasPerfumes } from "@/lib/catalogo-datos";

export const metadata: Metadata = {
    title: "Catálogo | Scenta",
    description: "Perfumes, difusores y aromas para el hogar y el auto. Armá tu pedido y consultalo por WhatsApp.",
};

// Se regenera cada 5 minutos: los cambios de precio y de stock aparecen solos sin sobrecargar la base.
export const revalidate = 300;

export default async function CatalogoPage() {
    const [productos, masPedidos, notas] = await Promise.all([getProductosPublicos(), getMasPedidos(), getNotasPerfumes()]);
    return <CatalogoClient productos={productos} masPedidos={masPedidos} notas={notas} />;
}
