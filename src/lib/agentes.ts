// El trabajo de cada agente del negocio: reciben los datos ya leídos de la base y devuelven
// lo que encontraron (pasos, números y hallazgos). No leen ni escriben la base: eso lo hace
// agentes-actions.ts, así esto se puede probar con datos de ejemplo.
import { calculadorDisponibilidad, buscarPerfumeHecho } from "./perfume-hecho";
import { slugDe, tipoDe, nombreYMarca } from "./catalogo-perfume";
import { ASISTENTES, type Propuesta, type Hallazgo, type Metrica, type ResultadoAgente, type IdAgente, type IdAgenteServidor, type Equipo, type DatosInstagram, type TrabajoAsistente } from "./agentes-tipos";

export type Producto = {
    id: string; name: string; category: string; gender: string;
    cost: number; price: number; priceMinorista: number;
    visible: boolean; foto: boolean; components: { id?: string; name?: string; type?: string; qty?: number }[];
};
export type FilaInventario = { id: string; name: string; type: string; category: string; gender?: string; qty: number; unit: string };
export type Insumo = { id: string; name: string; qty: number; unit: string; provider?: string; cost?: number };
export type Esencia = {
    id: string; name: string; price30g?: unknown; price100g?: unknown; cost?: unknown;
    provider?: string; qty?: number; enDolares?: boolean;
};
export type ItemVenta = { productoId: string; nombre: string; cantidad: number; precioUnitario: number; mayorista?: boolean };
export type Venta = { id: string; fecha: Date; total: number; cobrada: boolean; cancelada: boolean; cliente: string; items: ItemVenta[] };
/** Cliente con cuenta mayorista (solo nombre y estado: nada de datos de acceso) */
export type Mayorista = { usuario: string; activo: boolean };
export type Gasto = { fecha: Date; monto: number; descripcion: string };

export type Datos = {
    productos: Producto[];
    inventario: FilaInventario[];
    insumos: Insumo[];
    esencias: Esencia[];
    ventas: Venta[];
    slugsConNotas: Set<string>;
    hoy: Date;
    /** Familias de aromas de cada perfume (por slug), de sus notas */
    familias?: Map<string, string[]>;
    /** Dólar con el que se calculan los costos en dólares, y cuándo se actualizó */
    dolar?: { valor: number; actualizado: string | null } | null;
    mayoristas?: Mayorista[];
    solicitudesPendientes?: number;
    /** Egresos de la caja (compras y gastos) */
    gastos?: Gasto[];
    /** Cuenta de Instagram (solo para Marketing y si está conectada) */
    instagram?: DatosInstagram | null;
};

// Lo que hizo cada asistente (mini IA) del agente, en el orden de ASISTENTES
const asistentes = (id: IdAgente, hizo: [string, string]): TrabajoAsistente[] =>
    ASISTENTES[id].map((a, i) => ({ nombre: a.nombre, hizo: hizo[i] }));

export type Parcial = Omit<ResultadoAgente, "resumenIA" | "ejecutadoEn" | "duracionMs">;

const DIA = 86_400_000;
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const nombreCorto = (p: { name: string; category: string }) => {
    const { nombre, marca } = nombreYMarca(p.name);
    const ml = (p.category || "").match(/(\d+)\s*ml/i)?.[1];
    return `${nombre}${marca ? ` (${marca})` : ""}${ml ? ` ${ml} ml` : ""}`;
};

// Unidades vendidas por producto en los últimos `dias` (ventas no canceladas)
function unidadesVendidas(ventas: Venta[], hoy: Date, dias: number) {
    const desde = hoy.getTime() - dias * DIA;
    const m = new Map<string, number>();
    for (const v of ventas) {
        if (v.cancelada || v.fecha.getTime() < desde) continue;
        for (const it of v.items) m.set(it.productoId, (m.get(it.productoId) ?? 0) + it.cantidad);
    }
    return m;
}

// ── Reposición ───────────────────────────────────────────────────────────────
export function agenteReposicion(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const hechos = d.inventario.filter(i => i.type === "Perfume Hecho");
    const esenciasInv = d.inventario.filter(i => i.type === "Esencia");
    pasos.push(`Leí el inventario: ${plural(hechos.length, "perfume hecho", "perfumes hechos")} (${hechos.reduce((a, h) => a + h.qty, 0)} unidades) y ${plural(esenciasInv.length, "esencia", "esencias")} en stock.`);

    const vendidos = unidadesVendidas(d.ventas, d.hoy, 90);
    pasos.push(`Revisé las ventas de los últimos 90 días: ${plural(vendidos.size, "producto vendido", "productos distintos vendidos")}.`);

    const porId = new Map(d.productos.map(p => [p.id, p]));
    const disponibilidad = calculadorDisponibilidad(d.inventario, d.esencias);

    // 1. Perfumes hechos que se están terminando (los que se venden, primero)
    const porTerminar = hechos
        .filter(h => h.qty > 0 && h.qty <= 1)
        .map(h => {
            const producto = d.productos.find(p => buscarPerfumeHecho([h], p));
            return { h, vendidas: producto ? vendidos.get(producto.id) ?? 0 : 0 };
        })
        .sort((a, b) => b.vendidas - a.vendidas);
    pasos.push(`Busqué perfumes hechos con 1 unidad o menos: encontré ${porTerminar.length}.`);
    if (porTerminar.length > 0) {
        const conVentas = porTerminar.filter(x => x.vendidas > 0);
        hallazgos.push({
            nivel: conVentas.length > 0 ? "urgente" : "atencion",
            titulo: `${plural(porTerminar.length, "perfume hecho se está terminando", "perfumes hechos se están terminando")}`,
            detalle: conVentas.length > 0
                ? `${plural(conVentas.length, "de ellos se vendió", "de ellos se vendieron")} en los últimos 90 días: conviene preparar más.`
                : "Te queda 1 unidad de cada uno.",
            items: porTerminar.slice(0, 6).map(x => `${x.h.name} · queda ${x.h.qty}${x.vendidas ? ` · vendiste ${x.vendidas}` : ""}`),
            accion: { texto: "Ver inventario", href: "/inventario" },
        });
    }

    // 2. Lo que se vende y no tiene perfumes hechos (el cliente espera la demora)
    const vendidosSinHechos = [...vendidos.entries()]
        .map(([id, n]) => ({ p: porId.get(id), n }))
        .filter((x): x is { p: Producto; n: number } => !!x.p)
        .map(x => ({ ...x, estado: disponibilidad(x.p).estado }))
        .filter(x => x.estado !== "disponible")
        .sort((a, b) => b.n - a.n);
    pasos.push(`Crucé lo vendido con el stock: ${plural(vendidosSinHechos.length, "producto vendido no tiene", "productos vendidos no tienen")} perfumes hechos.`);
    if (vendidosSinHechos.length > 0) {
        const sinStock = vendidosSinHechos.filter(x => x.estado === "sin-stock");
        hallazgos.push({
            nivel: sinStock.length > 0 ? "urgente" : "atencion",
            titulo: "Se venden y no tenés hechos",
            detalle: sinStock.length > 0
                ? `${plural(sinStock.length, "tiene", "tienen")} además la esencia sin precio con el proveedor: hoy figuran sin stock en el catálogo.`
                : "Hoy salen con demora en el catálogo. Tener alguno hecho acelera la entrega.",
            items: vendidosSinHechos.slice(0, 6).map(x => `${nombreCorto(x.p)} · vendiste ${x.n}${x.estado === "sin-stock" ? " · sin stock" : ""}`),
            accion: { texto: "Ingresar stock", href: "/inventario" },
        });
    }

    // 3. Insumos bajos (frascos, tapas, etiquetas…)
    const insumosBajos = d.insumos.filter(i => i.qty <= 30).sort((a, b) => a.qty - b.qty);
    pasos.push(`Revisé ${plural(d.insumos.length, "insumo", "insumos")}: ${plural(insumosBajos.length, "está bajo", "están bajos")} (30 o menos).`);
    if (insumosBajos.length > 0) {
        hallazgos.push({
            nivel: insumosBajos.some(i => i.qty <= 10) ? "urgente" : "atencion",
            titulo: `${plural(insumosBajos.length, "insumo está bajo", "insumos están bajos")}`,
            items: insumosBajos.slice(0, 6).map(i => `${i.name} · quedan ${i.qty} ${i.unit}`),
            accion: { texto: "Ver insumos", href: "/insumos" },
        });
    }

    // 4. Esencias en stock con poca cantidad
    const esenciasBajas = esenciasInv.filter(e => e.qty < 50);
    if (esenciasBajas.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: `${plural(esenciasBajas.length, "esencia tiene", "esencias tienen")} menos de 50 g`,
            detalle: "Alcanza para pocos perfumes más.",
            items: esenciasBajas.slice(0, 6).map(e => `${e.name} · ${e.qty} ${e.unit}`),
            accion: { texto: "Ver inventario", href: "/inventario" },
        });
    }

    if (!hallazgos.some(h => h.nivel === "urgente" || h.nivel === "atencion")) {
        hallazgos.unshift({ nivel: "bien", titulo: "Stock en orden", detalle: "No hay nada que se esté por terminar." });
    }

    const metricas: Metrica[] = [
        { etiqueta: "Perfumes hechos", valor: String(hechos.reduce((a, h) => a + h.qty, 0)), detalle: plural(hechos.length, "producto", "productos"), tono: "salvia" },
        { etiqueta: "Por terminarse", valor: String(porTerminar.length), detalle: "1 unidad o menos", tono: porTerminar.length ? "terracota" : "neutro" },
        { etiqueta: "Se venden sin hechos", valor: String(vendidosSinHechos.length), detalle: "últimos 90 días", tono: vendidosSinHechos.length ? "arena" : "neutro" },
        { etiqueta: "Insumos bajos", valor: String(insumosBajos.length), detalle: plural(d.insumos.length, "insumo revisado", "insumos revisados"), tono: insumosBajos.length ? "terracota" : "neutro" },
    ];
    // Si lo que se vende se está quedando sin stock, llama a Marketing para no promocionarlo hasta reponer
    const seVendenYFaltan = [
        ...porTerminar.filter(x => x.vendidas > 0).map(x => x.h.name),
        ...vendidosSinHechos.filter(x => x.estado === "sin-stock").map(x => nombreCorto(x.p)),
    ];
    const equipo: Equipo | null = seVendenYFaltan.length > 0 ? {
        con: ["marketing"],
        motivo: "Hay perfumes que se venden y se están quedando sin stock",
        propuesta: `Marketing no los promociona hasta reponer, y se preparan primero: ${seVendenYFaltan.slice(0, 3).join(", ")}.`,
    } : null;
    if (equipo) pasos.push("Llamé a Marketing para coordinar qué no promocionar hasta reponer.");
    pasos.push("Listo: ordené lo encontrado de lo más urgente a lo menos.");
    // Propuestas de mejora del área
    const propuestas: Propuesta[] = [];
    const seVendenYSeTerminan = porTerminar.filter(x => x.vendidas > 0);
    if (seVendenYSeTerminan.length > 0) {
        propuestas.push({ impacto: "alto", titulo: `Prepará más de ${lista(seVendenYSeTerminan.map(x => x.h.name))}`, porque: "Se venden y te queda 1 o menos: el próximo pedido sale con demora.", accion: { texto: "Ir a Inventario", href: "/inventario" } });
    }
    if (vendidosSinHechos.length > 0) {
        propuestas.push({
            impacto: vendidosSinHechos.some(x => x.estado === "sin-stock") ? "alto" : "medio",
            titulo: "Tené siempre 1 o 2 hechos de lo que más se vende",
            porque: vendidosSinHechos.length === 1
                ? `Hoy ${nombreCorto(vendidosSinHechos[0].p)} se vende y no tenés ninguno hecho.`
                : `Hoy ${lista(vendidosSinHechos.map(x => nombreCorto(x.p)))} se venden y no tenés ninguno hecho.`,
            accion: { texto: "Ingresar stock", href: "/inventario" },
        });
    }
    if (insumosBajos.length > 0) {
        propuestas.push({ impacto: insumosBajos.some(i => i.qty <= 10) ? "alto" : "medio", titulo: `Comprá ${lista(insumosBajos.map(i => i.name))}`, porque: "Quedan 30 o menos y sin ellos no podés armar perfumes.", accion: { texto: "Ver insumos", href: "/insumos" } });
    }
    if (esenciasBajas.length > 0) {
        propuestas.push({ impacto: "bajo", titulo: `Reponé ${lista(esenciasBajas.map(e => e.name))}`, porque: "Les quedan menos de 50 g." });
    }
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Seguí así y revisá el stock una vez por semana", porque: "Hoy no hay nada por terminarse." });

    return {
        agente: "reposicion", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("reposicion", [
            `Contó ${hechos.reduce((a, h) => a + h.qty, 0)} perfumes hechos y ${esenciasInv.length} esencias; ${porTerminar.length} se están terminando.`,
            `Revisó ${d.insumos.length} insumos: ${insumosBajos.length} para comprar.`,
        ]),
    };
}

// ── Ventas y números ─────────────────────────────────────────────────────────
export function agenteVentas(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const validas = d.ventas.filter(v => !v.cancelada);
    const cobradas = validas.filter(v => v.cobrada);
    pasos.push(`Leí ${plural(d.ventas.length, "venta", "ventas")}: ${cobradas.length} cobradas${d.ventas.length - validas.length ? `, ${d.ventas.length - validas.length} canceladas` : ""}.`);

    const enRango = (v: Venta, desdeDias: number, hastaDias: number) => {
        const t = d.hoy.getTime() - v.fecha.getTime();
        return t >= hastaDias * DIA && t < desdeDias * DIA;
    };
    const mes = cobradas.filter(v => enRango(v, 30, 0));
    const mesAnterior = cobradas.filter(v => enRango(v, 60, 30));
    const total = (vs: Venta[]) => vs.reduce((a, v) => a + v.total, 0);
    const totalMes = total(mes);
    const totalAnterior = total(mesAnterior);
    pasos.push(`Sumé los últimos 30 días (${pesos(totalMes)}) y los 30 anteriores (${pesos(totalAnterior)}).`);

    let cambio = 0;
    if (totalAnterior > 0) {
        cambio = Math.round(((totalMes - totalAnterior) / totalAnterior) * 100);
        hallazgos.push({
            nivel: cambio >= 0 ? "bien" : "atencion",
            titulo: cambio >= 0 ? `Vendiste ${cambio}% más que el mes anterior` : `Vendiste ${Math.abs(cambio)}% menos que el mes anterior`,
            detalle: `${pesos(totalMes)} contra ${pesos(totalAnterior)}.`,
            accion: { texto: "Ver resumen", href: "/resumen" },
        });
    } else if (totalMes > 0) {
        hallazgos.push({ nivel: "dato", titulo: `Este mes entraron ${pesos(totalMes)}`, detalle: "El mes anterior no hubo ventas cobradas para comparar." });
    }

    // Días sin vender
    const ultima = validas.reduce<Date | null>((a, v) => (!a || v.fecha > a ? v.fecha : a), null);
    const diasSinVender = ultima ? Math.floor((d.hoy.getTime() - ultima.getTime()) / DIA) : null;
    if (diasSinVender !== null && diasSinVender >= 14) {
        hallazgos.push({
            nivel: "atencion",
            titulo: `Hace ${diasSinVender} días que no registrás una venta`,
            detalle: "Si vendiste y no lo cargaste, la Caja y el stock no están al día.",
            accion: { texto: "Ir a Caja", href: "/caja" },
        });
    }

    // Ganancia estimada (precio cobrado menos el costo actual del producto)
    const costoDe = new Map(d.productos.map(p => [p.id, p.cost]));
    let ingreso = 0, costo = 0, sinCosto = 0;
    const porProducto = new Map<string, { nombre: string; unidades: number; ingreso: number; ganancia: number }>();
    for (const v of cobradas) {
        for (const it of v.items) {
            const c = costoDe.get(it.productoId) ?? 0;
            const x = porProducto.get(it.productoId) ?? { nombre: it.nombre, unidades: 0, ingreso: 0, ganancia: 0 };
            x.unidades += it.cantidad;
            x.ingreso += it.precioUnitario * it.cantidad;
            // Sin costo conocido (producto borrado o sin cargar) no se cuenta en la ganancia: la inflaría
            if (c > 0) {
                ingreso += it.precioUnitario * it.cantidad;
                costo += c * it.cantidad;
                x.ganancia += (it.precioUnitario - c) * it.cantidad;
            } else sinCosto += it.cantidad;
            porProducto.set(it.productoId, x);
        }
    }
    const ganancia = ingreso - costo;
    const margen = costo > 0 ? Math.round((ganancia / costo) * 100) : null;
    pasos.push(`Calculé la ganancia de ${plural(porProducto.size, "producto vendido", "productos vendidos")} con su costo actual.`);

    const masVendidos = [...porProducto.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
    if (masVendidos.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: "Lo más vendido",
            items: masVendidos.map(x => `${x.nombre} · ${plural(x.unidades, "unidad", "unidades")} · ${pesos(x.ingreso)}`),
        });
    }
    const masRentables = [...porProducto.values()].filter(x => x.ganancia > 0).sort((a, b) => b.ganancia - a.ganancia).slice(0, 5);
    if (masRentables.length > 1) {
        hallazgos.push({
            nivel: "dato",
            titulo: "Lo que más ganancia te dejó",
            items: masRentables.map(x => `${x.nombre} · ganaste ${pesos(x.ganancia)}`),
        });
    }

    // Pendiente de cobro
    const pendientes = validas.filter(v => !v.cobrada);
    if (pendientes.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: `Tenés ${pesos(total(pendientes))} sin cobrar`,
            detalle: plural(pendientes.length, "pedido pendiente de pago", "pedidos pendientes de pago"),
            items: pendientes.slice(0, 6).map(v => `${v.cliente} · ${pesos(v.total)} · ${v.fecha.toLocaleDateString("es-AR")}`),
            accion: { texto: "Ver pedidos", href: "/pedidos-solicitud" },
        });
    }
    if (sinCosto > 0) {
        hallazgos.push({ nivel: "dato", titulo: `${plural(sinCosto, "unidad vendida no tiene", "unidades vendidas no tienen")} costo conocido`, detalle: "Son de productos borrados o sin costo cargado: quedaron afuera de la ganancia." });
    }

    const metricas: Metrica[] = [
        { etiqueta: "Últimos 30 días", valor: pesos(totalMes), detalle: plural(mes.length, "venta", "ventas"), tono: "salvia" },
        { etiqueta: "Ticket promedio", valor: cobradas.length ? pesos(total(cobradas) / cobradas.length) : "—", detalle: "de todas las ventas", tono: "neutro" },
        { etiqueta: "Ganancia estimada", valor: pesos(ganancia), detalle: margen !== null ? `${margen}% sobre el costo` : "sin costos cargados", tono: ganancia >= 0 ? "salvia" : "terracota" },
        { etiqueta: "Sin cobrar", valor: pesos(total(pendientes)), detalle: plural(pendientes.length, "pedido", "pedidos"), tono: pendientes.length ? "arena" : "neutro" },
    ];
    // Si las ventas bajaron fuerte, llama a Marketing para armar una promo con lo que más sale
    const equipo: Equipo | null = cambio <= -10 && masVendidos.length > 0 ? {
        con: ["marketing"],
        motivo: `Las ventas bajaron ${Math.abs(cambio)}% contra el mes anterior`,
        propuesta: `Armar una promo con lo que más sale: ${masVendidos.slice(0, 3).map(x => x.nombre).join(", ")}.`,
    } : null;
    if (equipo) pasos.push("Llamé a Marketing para pensar una promo que levante las ventas.");
    pasos.push("Listo: armé el resumen de números.");
    // Propuestas de mejora del área
    const propuestas: Propuesta[] = [];
    if (cambio <= -10) {
        propuestas.push({ impacto: "alto", titulo: "Armá una promo para levantar las ventas", porque: `Bajaron ${Math.abs(cambio)}% contra el mes anterior.${masVendidos.length ? ` Usá lo que más sale: ${lista(masVendidos.map(x => x.nombre))}.` : ""}`, accion: { texto: "Ir a Promociones", href: "/promociones" } });
    }
    if (pendientes.length > 0) {
        propuestas.push({ impacto: "alto", titulo: `Cobrá los ${pesos(total(pendientes))} pendientes`, porque: `${plural(pendientes.length, "pedido está", "pedidos están")} sin pagar: ${lista(pendientes.map(v => v.cliente))}.`, accion: { texto: "Ver pedidos", href: "/pedidos-solicitud" } });
    }
    if (diasSinVender !== null && diasSinVender >= 14) {
        propuestas.push({ impacto: "medio", titulo: "Cargá las ventas al día en la Caja", porque: `Hace ${diasSinVender} días que no hay ventas registradas: así los números no son reales.`, accion: { texto: "Ir a Caja", href: "/caja" } });
    }
    if (masRentables.length > 1) {
        propuestas.push({ impacto: "medio", titulo: `Empujá lo que más ganancia te deja: ${lista(masRentables.map(x => x.nombre))}`, porque: "Vendiendo más de estos ganás más con el mismo trabajo." });
    }
    if (sinCosto > 0) {
        propuestas.push({ impacto: "bajo", titulo: "Cargá el costo de todos los productos", porque: "Sin costo no se puede saber cuánto ganás de verdad.", accion: { texto: "Ver lista de precios", href: "/lista-precios" } });
    }
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Seguí así", porque: "Las ventas vienen bien y no hay nada pendiente de cobro." });

    return {
        agente: "ventas", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("ventas", [
            `Sumó ${pesos(totalMes)} en 30 días y ${pesos(total(pendientes))} sin cobrar.`,
            `Calculó la ganancia de ${plural(porProducto.size, "producto", "productos")}: ${pesos(ganancia)}.`,
        ]),
    };
}

// ── Catálogo ─────────────────────────────────────────────────────────────────
export function agenteCatalogo(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const publicados = d.productos.filter(p => p.visible && p.priceMinorista > 0);
    pasos.push(`Leí ${d.productos.length} productos: ${publicados.length} se ven en el catálogo.`);
    const vendidos = unidadesVendidas(d.ventas, d.hoy, 365);

    // 1. Precio por debajo del costo: se pierde plata con cada venta
    const pierden = publicados.filter(p => p.cost > 0 && p.priceMinorista < p.cost).sort((a, b) => (a.priceMinorista - a.cost) - (b.priceMinorista - b.cost));
    pasos.push(`Comparé precio y costo: ${plural(pierden.length, "producto se vende", "productos se venden")} por debajo del costo.`);
    if (pierden.length > 0) {
        hallazgos.push({
            nivel: "urgente",
            titulo: `${plural(pierden.length, "producto se vende", "productos se venden")} por debajo de lo que te cuesta`,
            detalle: "Cada venta te hace perder plata. Revisá el precio o el costo.",
            items: pierden.slice(0, 6).map(p => `${nombreCorto(p)} · precio ${pesos(p.priceMinorista)} · costo ${pesos(p.cost)}`),
            accion: { texto: "Ver lista de precios", href: "/lista-precios" },
        });
    }

    // 2. Publicados sin foto (los que más se venden, primero)
    const sinFoto = publicados.filter(p => !p.foto).sort((a, b) => (vendidos.get(b.id) ?? 0) - (vendidos.get(a.id) ?? 0));
    pasos.push(`Revisé las fotos: ${plural(sinFoto.length, "producto publicado no tiene", "productos publicados no tienen")} foto.`);
    if (sinFoto.length > 0) {
        hallazgos.push({
            nivel: sinFoto.length > publicados.length / 2 ? "atencion" : "dato",
            titulo: `${sinFoto.length} de ${publicados.length} productos publicados no tienen foto`,
            detalle: "Empezá por estos, que son los que más se venden:",
            items: sinFoto.slice(0, 6).map(p => `${nombreCorto(p)}${vendidos.get(p.id) ? ` · vendiste ${vendidos.get(p.id)}` : ""}`),
            accion: { texto: "Cargar fotos en Mi catálogo", href: "/mi-catalogo" },
        });
    }

    // 3. Perfumes publicados sin notas olfativas
    const slugsSinNotas = new Map<string, Producto>();
    for (const p of publicados) {
        if (tipoDe(p) !== "perfumes") continue;
        const s = slugDe({ name: p.name.trim(), category: p.category.trim(), gender: p.gender.trim() || "Unisex" });
        if (!d.slugsConNotas.has(s) && !slugsSinNotas.has(s)) slugsSinNotas.set(s, p);
    }
    pasos.push(`Busqué perfumes sin notas: ${slugsSinNotas.size}.`);
    if (slugsSinNotas.size > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: `${plural(slugsSinNotas.size, "perfume no tiene", "perfumes no tienen")} notas cargadas`,
            detalle: "No aparecen al filtrar por notas y su ficha queda vacía.",
            items: [...slugsSinNotas.values()].slice(0, 6).map(p => nombreYMarca(p.name).nombre),
            accion: { texto: "Cargar notas en Mi catálogo", href: "/mi-catalogo" },
        });
    }

    // 4. Visibles sin precio: el cliente no los ve
    const sinPrecio = d.productos.filter(p => p.visible && !(p.priceMinorista > 0));
    if (sinPrecio.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: `${plural(sinPrecio.length, "producto no aparece", "productos no aparecen")} por no tener precio minorista`,
            items: sinPrecio.slice(0, 6).map(nombreCorto),
            accion: { texto: "Ver Mi catálogo", href: "/mi-catalogo" },
        });
    }

    // 5. Sin costo: no se puede calcular la ganancia
    const sinCosto = publicados.filter(p => !(p.cost > 0));
    if (sinCosto.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: `${plural(sinCosto.length, "producto no tiene", "productos no tienen")} costo cargado`,
            detalle: "Sin costo no se puede saber cuánto ganás.",
            items: sinCosto.slice(0, 6).map(nombreCorto),
        });
    }

    if (!hallazgos.some(h => h.nivel === "urgente" || h.nivel === "atencion")) {
        hallazgos.unshift({ nivel: "bien", titulo: "El catálogo está en orden" });
    }

    const pct = (n: number) => (publicados.length ? `${Math.round((n / publicados.length) * 100)}%` : "—");
    const perfumesPublicados = new Set(publicados.filter(p => tipoDe(p) === "perfumes").map(p => slugDe({ name: p.name.trim(), category: p.category.trim(), gender: p.gender.trim() || "Unisex" })));
    const metricas: Metrica[] = [
        { etiqueta: "Publicados", valor: String(publicados.length), detalle: `de ${d.productos.length} productos`, tono: "salvia" },
        { etiqueta: "Con foto", valor: pct(publicados.length - sinFoto.length), detalle: `${publicados.length - sinFoto.length} productos`, tono: sinFoto.length > publicados.length / 2 ? "terracota" : "salvia" },
        { etiqueta: "Perfumes con notas", valor: perfumesPublicados.size ? `${Math.round(((perfumesPublicados.size - slugsSinNotas.size) / perfumesPublicados.size) * 100)}%` : "—", detalle: `${perfumesPublicados.size - slugsSinNotas.size} de ${perfumesPublicados.size}`, tono: "arena" },
        { etiqueta: "Pierden plata", valor: String(pierden.length), detalle: "precio menor al costo", tono: pierden.length ? "terracota" : "neutro" },
    ];
    // Arma equipo si hace falta: con Ventas por los precios que dan pérdida, o con Marketing
    // si lo que más se vende no tiene foto (no se puede publicar bien)
    const vendidosSinFoto = sinFoto.filter(p => (vendidos.get(p.id) ?? 0) > 0);
    const equipo: Equipo | null = pierden.length > 0 ? {
        con: ["ventas"],
        motivo: `${plural(pierden.length, "producto se vende", "productos se venden")} por debajo del costo`,
        propuesta: `Revisar juntos el precio de: ${pierden.slice(0, 3).map(nombreCorto).join(", ")}.`,
    } : vendidosSinFoto.length > 0 ? {
        con: ["marketing"],
        motivo: "Lo que más se vende no tiene foto",
        propuesta: `Sacarles foto primero, así Marketing los puede publicar: ${vendidosSinFoto.slice(0, 3).map(nombreCorto).join(", ")}.`,
    } : null;
    if (equipo) pasos.push(`Llamé a ${equipo.con[0] === "ventas" ? "Ventas" : "Marketing"} para resolverlo en equipo.`);
    pasos.push("Listo: ordené los arreglos por importancia.");
    // Propuestas de mejora del área
    const propuestas: Propuesta[] = [];
    if (pierden.length > 0) {
        propuestas.push({ impacto: "alto", titulo: `Subí el precio de ${lista(pierden.map(nombreCorto))}`, porque: "Hoy los vendés por debajo de lo que te cuestan.", accion: { texto: "Ver lista de precios", href: "/lista-precios" } });
    }
    if (vendidosSinFoto.length > 0) {
        propuestas.push({ impacto: "alto", titulo: `Sacale foto a ${lista(vendidosSinFoto.map(nombreCorto))}`, porque: "Son de lo que más se vende y en el catálogo aparecen sin foto.", accion: { texto: "Ir a Mi catálogo", href: "/mi-catalogo" } });
    } else if (sinFoto.length > 0) {
        propuestas.push({ impacto: "medio", titulo: `Cargá fotos de a poco: empezá por ${lista(sinFoto.map(nombreCorto))}`, porque: `${sinFoto.length} de ${publicados.length} productos publicados no tienen foto.`, accion: { texto: "Ir a Mi catálogo", href: "/mi-catalogo" } });
    }
    if (slugsSinNotas.size > 0) {
        propuestas.push({ impacto: "medio", titulo: `Cargá las notas de ${lista([...slugsSinNotas.values()].map(p => nombreYMarca(p.name).nombre))}`, porque: "Sin notas no aparecen al filtrar y su ficha queda vacía.", accion: { texto: "Ir a Mi catálogo", href: "/mi-catalogo" } });
    }
    if (sinPrecio.length > 0) {
        propuestas.push({ impacto: "medio", titulo: `Poné precio a ${lista(sinPrecio.map(nombreCorto))}`, porque: "Están marcados como visibles pero el cliente no los ve." });
    }
    if (sinCosto.length > 0) {
        propuestas.push({ impacto: "bajo", titulo: "Cargá el costo de los productos que no lo tienen", porque: `${plural(sinCosto.length, "producto no tiene", "productos no tienen")} costo: no se puede controlar si ganás.` });
    }
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "El catálogo está en orden: mantenelo así", porque: "No hay fotos, precios ni notas faltantes." });

    return {
        agente: "catalogo", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("catalogo", [
            `Revisó ${publicados.length} fichas: ${sinFoto.length} sin foto y ${slugsSinNotas.size} perfumes sin notas.`,
            `Comparó precio y costo: ${plural(pierden.length, "producto da", "productos dan")} pérdida.`,
        ]),
    };
}

// ── Marketing ────────────────────────────────────────────────────────────────
// Devuelve poco y claro: qué publicar, qué poner en promo y a quién escribirle.
export function agenteMarketing(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const publicados = d.productos.filter(p => p.visible && p.priceMinorista > 0);
    const validas = d.ventas.filter(v => !v.cancelada);
    pasos.push(`Leí ${plural(publicados.length, "producto publicado", "productos publicados")} y ${plural(validas.length, "venta", "ventas")}.`);

    const vendidos = unidadesVendidas(d.ventas, d.hoy, 90);
    const disponibilidad = calculadorDisponibilidad(d.inventario, d.esencias);

    // 1. Qué publicar: lo más vendido de los últimos 90 días que tiene foto y stock
    const estrellas = publicados
        .filter(p => (vendidos.get(p.id) ?? 0) > 0)
        .sort((a, b) => (vendidos.get(b.id) ?? 0) - (vendidos.get(a.id) ?? 0))
        .slice(0, 8);
    const listas = estrellas.filter(p => p.foto && disponibilidad(p).estado !== "sin-stock");
    const sinFoto = estrellas.filter(p => !p.foto);
    const sinStock = estrellas.filter(p => disponibilidad(p).estado === "sin-stock");
    pasos.push(`Busqué lo más vendido: ${listas.length} listos para publicar.`);
    if (listas.length > 0) {
        hallazgos.push({
            nivel: "bien",
            titulo: "Publicá esto esta semana",
            detalle: "Es lo que más se vende y tiene foto y stock.",
            items: listas.slice(0, 3).map(p => `${nombreCorto(p)} · vendiste ${vendidos.get(p.id)}`),
        });
    }
    if (sinFoto.length > 0 || sinStock.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: "Se venden, pero todavía no los publiques",
            detalle: "Primero les falta foto o stock.",
            items: [...sinFoto.map(p => `${nombreCorto(p)} · sin foto`), ...sinStock.map(p => `${nombreCorto(p)} · sin stock`)].slice(0, 3),
        });
    }

    // 2. Qué poner en promo: perfumes hechos que no se vendieron en 90 días
    const quietos = d.inventario
        .filter(i => i.type === "Perfume Hecho" && i.qty > 0)
        .filter(i => {
            const p = d.productos.find(pr => buscarPerfumeHecho([i], pr));
            return !p || (vendidos.get(p.id) ?? 0) === 0;
        })
        .sort((a, b) => b.qty - a.qty);
    pasos.push(`Busqué stock que no se mueve: ${plural(quietos.length, "perfume", "perfumes")}.`);
    if (quietos.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: "Armá una promo con estos",
            detalle: "Están hechos y no se vendieron en 3 meses.",
            items: quietos.slice(0, 3).map(i => `${i.name} · ${i.qty} ${i.qty === 1 ? "hecho" : "hechos"}`),
            accion: { texto: "Ir a Promociones", href: "/promociones" },
        });
    }

    // 3. A quién escribirle: clientes que compraron y hace más de 2 meses no vuelven
    const clientes = new Map<string, { compras: number; total: number; ultima: Date }>();
    for (const v of validas) {
        const nombre = v.cliente?.trim();
        if (!nombre || /consumidor|final|sin nombre/i.test(nombre)) continue;
        const c = clientes.get(nombre) ?? { compras: 0, total: 0, ultima: v.fecha };
        c.compras += 1;
        c.total += v.total;
        if (v.fecha > c.ultima) c.ultima = v.fecha;
        clientes.set(nombre, c);
    }
    const dias = (f: Date) => Math.floor((d.hoy.getTime() - f.getTime()) / DIA);
    const recurrentes = [...clientes.values()].filter(c => c.compras >= 2).length;
    const dormidos = [...clientes.entries()]
        .filter(([, c]) => dias(c.ultima) >= 60 && dias(c.ultima) <= 365)
        .sort((a, b) => b[1].total - a[1].total);
    pasos.push(`Revisé ${plural(clientes.size, "cliente", "clientes")}: ${dormidos.length} para volver a escribirles.`);
    if (dormidos.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: "Escribile a estos clientes",
            detalle: "Compraron antes y hace más de 2 meses que no vuelven.",
            items: dormidos.slice(0, 3).map(([n, c]) => `${n} · hace ${dias(c.ultima)} días`),
        });
    }
    if (hallazgos.length === 0) {
        hallazgos.push({ nivel: "dato", titulo: "Todavía no hay ventas suficientes para recomendar algo" });
    }

    // 4. Instagram (si está conectado): solo lo importante
    const ig = d.instagram;
    let diasSinPublicar: number | null = null;
    if (ig) {
        const ultima = ig.ultimas[0]?.fecha ? new Date(ig.ultimas[0].fecha) : null;
        diasSinPublicar = ultima && !Number.isNaN(ultima.getTime()) ? dias(ultima) : null;
        const mejor = [...ig.ultimas.slice(0, 12)].sort((a, b) => (b.meGusta + b.comentarios * 3) - (a.meGusta + a.comentarios * 3))[0];
        pasos.push(`Miré Instagram (@${ig.usuario}): ${ig.seguidores.toLocaleString("es-AR")} seguidores.`);
        if (mejor) {
            hallazgos.push({
                nivel: "dato",
                titulo: "Tu mejor publicación reciente en Instagram",
                items: [`${mejor.texto || "Publicación"} · ${mejor.meGusta} me gusta · ${mejor.comentarios} comentarios`],
            });
        }
    }

    // Propuestas de mejora del área
    const propuestas: Propuesta[] = [];
    if (diasSinPublicar !== null && diasSinPublicar >= 7) {
        propuestas.push({ impacto: "alto", titulo: "Volvé a publicar en Instagram", porque: `Hace ${diasSinPublicar} días que no publicás.${listas[0] ? ` Empezá por ${nombreCorto(listas[0])}.` : ""}` });
    }
    if (listas.length > 0) {
        propuestas.push({ impacto: "alto", titulo: `Publicá ${lista(listas.map(nombreCorto))}`, porque: "Es lo que más se vende y está listo: foto y stock." });
    }
    if (dormidos.length > 0) {
        propuestas.push({ impacto: "medio", titulo: `Mandale un mensaje a ${lista(dormidos.map(([n]) => n))}`, porque: "Ya te compraron: una novedad o una promo suele traerlos de vuelta." });
    }
    if (quietos.length > 0) {
        propuestas.push({ impacto: "medio", titulo: `Armá una promo o un combo con ${lista(quietos.map(i => i.name))}`, porque: "Es stock que tenés hecho y no se mueve.", accion: { texto: "Ir a Promociones", href: "/promociones" } });
    }
    if (sinFoto.length > 0 || sinStock.length > 0) {
        propuestas.push({ impacto: "medio", titulo: "Dejá listos para publicar los que se venden", porque: "Algunos de los más vendidos no tienen foto o stock: pierden lugar en las publicaciones." });
    }

    // Arma equipo: lo más vendido sin foto → Catálogo; sin stock → Reposición
    const con: IdAgente[] = [];
    if (sinFoto.length > 0) con.push("catalogo");
    if (sinStock.length > 0) con.push("reposicion");
    const equipo: Equipo | null = con.length > 0 ? {
        con,
        motivo: "Lo que más se vende no se puede publicar",
        propuesta: [
            sinFoto.length ? `Catálogo les saca foto a ${lista(sinFoto.map(nombreCorto))}` : "",
            sinStock.length ? `Reposición prepara ${lista(sinStock.map(nombreCorto))}` : "",
        ].filter(Boolean).join(" y ") + "; después Marketing los publica.",
    } : null;
    if (equipo) pasos.push("Armé un equipo para dejar listos los productos que conviene publicar.");

    const metricas: Metrica[] = [
        { etiqueta: "Para publicar", valor: String(listas.length), detalle: "se venden, con foto y stock", tono: "salvia" },
        { etiqueta: "Para promo", valor: String(quietos.length), detalle: "sin ventas en 3 meses", tono: quietos.length ? "arena" : "neutro" },
        { etiqueta: "Para escribirles", valor: String(dormidos.length), detalle: "clientes que no vuelven", tono: dormidos.length ? "arena" : "neutro" },
        ig
            ? { etiqueta: "Seguidores en Instagram", valor: ig.seguidores.toLocaleString("es-AR"), detalle: `@${ig.usuario}`, tono: "salvia" }
            : { etiqueta: "Vuelven a comprar", valor: clientes.size ? `${Math.round((recurrentes / clientes.size) * 100)}%` : "—", detalle: `${recurrentes} de ${clientes.size} clientes`, tono: "neutro" },
    ];
    pasos.push("Listo: te dejé qué publicar, qué poner en promo y a quién escribirle.");
    return {
        agente: "marketing", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("marketing", [
            `Encontró ${listas.length} para publicar y ${quietos.length} perfumes quietos${ig ? `; revisó ${ig.ultimas.length} publicaciones de Instagram` : ""}.`,
            `Revisó ${clientes.size} clientes: ${dormidos.length} para volver a escribirles.`,
        ]),
    };
}

// ── Costos y precios ─────────────────────────────────────────────────────────

// Costo de hoy de un producto, armado con su fórmula y los precios actuales de esencias e insumos
// (la misma cuenta que la Lista de precios). null si falta algún componente o su precio.
function costoActual(p: Producto, esencias: Esencia[], insumos: Insumo[]): number | null {
    if (p.components.length === 0) return null;
    let total = 0;
    for (const c of p.components) {
        const nombre = (c.name ?? "").toLowerCase();
        const cantidad = Number(c.qty) || 0;
        if (c.type === "Esencia") {
            const e = esencias.find(x => x.id === c.id || x.name.toLowerCase() === nombre);
            if (!e) return null;
            const p100 = Number(e.price100g), p30 = Number(e.price30g), costo = Number(e.cost);
            const porGramo = p100 > 0 ? p100 / 100 : p30 > 0 ? p30 / 30 : costo > 0 ? costo / (e.qty || 1) : 0;
            if (!(porGramo > 0)) return null;
            total += porGramo * cantidad;
        } else {
            const i = insumos.find(x => x.id === c.id || x.name.toLowerCase() === nombre);
            if (!i || !((i.cost ?? 0) > 0)) return null;
            total += ((i.cost ?? 0) / (i.qty || 1)) * cantidad;
        }
    }
    return total > 0 && Number.isFinite(total) ? total : null;
}
const mediana = (xs: number[]) => {
    if (xs.length === 0) return null;
    const o = [...xs].sort((a, b) => a - b);
    return o[Math.floor(o.length / 2)];
};
const redondear = (n: number) => Math.ceil(n / 100) * 100;
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function agenteCostos(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const enDolares = d.esencias.filter(e => e.enDolares).length;
    pasos.push(d.dolar
        ? `Tomé el dólar de hoy: ${pesos(d.dolar.valor)} (${plural(enDolares, "esencia tiene", "esencias tienen")} el precio en dólares).`
        : "No encontré la cotización del dólar guardada: uso los precios en pesos.");

    const publicados = d.productos.filter(p => p.visible && p.priceMinorista > 0);
    const filas = publicados.map(p => {
        const hoy = costoActual(p, d.esencias, d.insumos);
        const real = hoy ?? (p.cost > 0 ? p.cost : null);
        return {
            p, hoy, real,
            viejo: hoy !== null && p.cost > 0 && hoy > p.cost * 1.05,
            margenMin: real ? (p.priceMinorista - real) / real : null,
            margenMay: real && p.price > 0 ? (p.price - real) / real : null,
        };
    });
    const sinCalcular = filas.filter(f => f.real === null);
    pasos.push(`Recalculé el costo de ${plural(filas.length - sinCalcular.length, "producto", "productos")} con su fórmula y los precios de hoy.`);

    // El margen "normal" del negocio: el del medio de todos los productos (así la propuesta respeta tu forma de poner precios)
    const objetivoMin = mediana(filas.map(f => f.margenMin).filter((m): m is number => m !== null && m > 0)) ?? 1;
    const objetivoMay = mediana(filas.map(f => f.margenMay).filter((m): m is number => m !== null && m > 0));
    pasos.push(`Tu margen típico es ${pct(objetivoMin)} sobre el costo en minorista${objetivoMay ? ` y ${pct(objetivoMay)} en mayorista` : ""}.`);

    const piso = Math.max(0.3, objetivoMin * 0.5);
    const pocoMargen = filas
        .filter(f => f.margenMin !== null && f.margenMin < piso)
        .sort((a, b) => (a.margenMin ?? 0) - (b.margenMin ?? 0))
        .map(f => ({ ...f, sugerido: redondear((f.real ?? 0) * (1 + objetivoMin)) }));
    const viejos = filas.filter(f => f.viejo).sort((a, b) => ((b.hoy ?? 0) / b.p.cost) - ((a.hoy ?? 0) / a.p.cost));
    pasos.push(`Encontré ${plural(pocoMargen.length, "producto", "productos")} con poco margen y ${plural(viejos.length, "costo cargado viejo", "costos cargados viejos")}.`);

    if (pocoMargen.length > 0) {
        hallazgos.push({
            nivel: pocoMargen.some(f => (f.margenMin ?? 0) < 0) ? "urgente" : "atencion",
            titulo: "Quedaron con poco margen",
            detalle: `Ganás menos de ${pct(piso)} sobre el costo. Al lado, el precio para volver a tu margen típico.`,
            items: pocoMargen.slice(0, 5).map(f => `${nombreCorto(f.p)} · ganás ${pct(f.margenMin ?? 0)} · sugerido ${pesos(f.sugerido)}`),
            accion: { texto: "Ver lista de precios", href: "/lista-precios" },
        });
    }
    if (viejos.length > 0) {
        hallazgos.push({
            nivel: "atencion",
            titulo: "El costo cargado quedó viejo",
            detalle: "Con los precios de hoy, estos perfumes cuestan más de lo que tenés cargado: la ganancia real es menor.",
            items: viejos.slice(0, 5).map(f => `${nombreCorto(f.p)} · cargado ${pesos(f.p.cost)} · hoy ${pesos(f.hoy ?? 0)}`),
            accion: { texto: "Ver lista de precios", href: "/lista-precios" },
        });
    }
    if (sinCalcular.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: `${plural(sinCalcular.length, "producto no tiene", "productos no tienen")} costo calculable`,
            detalle: "Les falta la fórmula o el precio de algún componente.",
            items: sinCalcular.slice(0, 5).map(f => nombreCorto(f.p)),
        });
    }
    if (pocoMargen.length === 0 && viejos.length === 0) {
        hallazgos.push({ nivel: "bien", titulo: "Los precios cubren bien los costos", detalle: `Todos ganan al menos ${pct(piso)} sobre el costo.` });
    }

    const propuestas: Propuesta[] = [];
    for (const f of pocoMargen.slice(0, 2)) {
        propuestas.push({
            impacto: (f.margenMin ?? 0) < 0.1 ? "alto" : "medio",
            titulo: `Subí ${nombreCorto(f.p)} a ${pesos(f.sugerido)}`,
            porque: `Hoy cuesta ${pesos(f.real ?? 0)} y lo vendés a ${pesos(f.p.priceMinorista)}: ganás ${pct(f.margenMin ?? 0)}, menos que tu margen típico de ${pct(objetivoMin)}.`,
            accion: { texto: "Ver lista de precios", href: "/lista-precios" },
        });
    }
    if (viejos.length > 0) {
        propuestas.push({ impacto: "medio", titulo: `Actualizá el costo cargado de ${lista(viejos.map(f => nombreCorto(f.p)))}`, porque: "Subieron las esencias o los insumos y el costo guardado no lo refleja." });
    }
    if (sinCalcular.length > 0) {
        propuestas.push({ impacto: "bajo", titulo: `Completá la fórmula de ${lista(sinCalcular.map(f => nombreCorto(f.p)))}`, porque: "Sin fórmula completa no se puede controlar cuánto ganás con ellos." });
    }
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Revisá los precios cada vez que sube el dólar", porque: "Hoy todos los precios cubren bien los costos." });

    const equipo: Equipo | null = pocoMargen.length > 0 ? {
        con: ["ventas", "catalogo"],
        motivo: "Hay precios que quedaron con poco margen",
        propuesta: `Actualizar juntos la lista con los precios sugeridos: ${lista(pocoMargen.map(f => `${nombreCorto(f.p)} a ${pesos(f.sugerido)}`))}.`,
    } : null;
    if (equipo) pasos.push("Llamé a Ventas y Catálogo para actualizar los precios.");

    const metricas: Metrica[] = [
        { etiqueta: "Dólar", valor: d.dolar ? pesos(d.dolar.valor) : "—", detalle: d.dolar?.actualizado ? `actualizado ${new Date(d.dolar.actualizado).toLocaleDateString("es-AR")}` : "sin cotización", tono: "neutro" },
        { etiqueta: "Margen típico", valor: pct(objetivoMin), detalle: "minorista, sobre el costo", tono: "salvia" },
        { etiqueta: "Poco margen", valor: String(pocoMargen.length), detalle: `ganan menos de ${pct(piso)}`, tono: pocoMargen.length ? "terracota" : "neutro" },
        { etiqueta: "Costos viejos", valor: String(viejos.length), detalle: "cuestan más que lo cargado", tono: viejos.length ? "arena" : "neutro" },
    ];
    pasos.push("Listo: te dejé los precios a revisar.");
    return {
        agente: "costos", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("costos", [
            `Recalculó ${filas.length - sinCalcular.length} costos; ${viejos.length} quedaron más caros que lo cargado.`,
            `Comparó ${filas.length} precios: ${pocoMargen.length} con poco margen.`,
        ]),
    };
}

// ── Revendedores ─────────────────────────────────────────────────────────────
export function agenteRevendedores(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const mayoristas = d.mayoristas ?? [];
    const nombres = new Map(mayoristas.map(m => [m.usuario.toLowerCase(), m.usuario]));
    const validas = d.ventas.filter(v => !v.cancelada);
    // Pedidos de mayoristas: los de un cliente con cuenta mayorista o con precio mayorista
    const pedidos = validas.filter(v => nombres.has(v.cliente.trim().toLowerCase()) || v.items.some(i => i.mayorista));
    pasos.push(`Leí ${plural(mayoristas.length, "cuenta mayorista", "cuentas mayoristas")} y ${plural(pedidos.length, "pedido mayorista", "pedidos mayoristas")}.`);

    const dias = (f: Date) => Math.floor((d.hoy.getTime() - f.getTime()) / DIA);
    const porCliente = new Map<string, { nombre: string; total90: number; pedidos: number; ultima: Date }>();
    for (const v of pedidos) {
        const clave = v.cliente.trim().toLowerCase();
        const c = porCliente.get(clave) ?? { nombre: nombres.get(clave) ?? v.cliente.trim(), total90: 0, pedidos: 0, ultima: v.fecha };
        c.pedidos += 1;
        if (dias(v.fecha) <= 90) c.total90 += v.total;
        if (v.fecha > c.ultima) c.ultima = v.fecha;
        porCliente.set(clave, c);
    }
    const clientes = [...porCliente.values()];
    const mejores = clientes.filter(c => c.total90 > 0).sort((a, b) => b.total90 - a.total90);
    const dormidos = clientes.filter(c => dias(c.ultima) >= 45 && dias(c.ultima) <= 365).sort((a, b) => dias(a.ultima) - dias(b.ultima));
    const nunca = mayoristas.filter(m => m.activo && !porCliente.has(m.usuario.toLowerCase()));
    const total90 = mejores.reduce((a, c) => a + c.total90, 0);
    pasos.push(`Sumé lo que compró cada uno: ${pesos(total90)} en 90 días; ${dormidos.length} dejaron de comprar.`);

    const unidades = new Map<string, { nombre: string; n: number }>();
    for (const v of pedidos) {
        if (dias(v.fecha) > 90) continue;
        for (const it of v.items) {
            const x = unidades.get(it.productoId) ?? { nombre: it.nombre, n: 0 };
            x.n += it.cantidad;
            unidades.set(it.productoId, x);
        }
    }
    const masPedidos = [...unidades.values()].sort((a, b) => b.n - a.n).slice(0, 5);
    const pendientes = d.solicitudesPendientes ?? 0;

    if (pendientes > 0) {
        hallazgos.push({ nivel: "urgente", titulo: `${plural(pendientes, "solicitud de cuenta mayorista espera", "solicitudes de cuenta mayorista esperan")} respuesta`, detalle: "Cada una es un posible revendedor nuevo." });
    }
    if (mejores.length > 0) {
        hallazgos.push({ nivel: "bien", titulo: "Tus mejores revendedores", detalle: "Lo que compraron en los últimos 90 días.", items: mejores.slice(0, 3).map(c => `${c.nombre} · ${pesos(c.total90)} · ${plural(c.pedidos, "pedido", "pedidos")}`) });
    }
    if (dormidos.length > 0) {
        hallazgos.push({ nivel: "atencion", titulo: "Dejaron de comprarte", detalle: "Compraban y hace más de 45 días que no hacen un pedido.", items: dormidos.slice(0, 3).map(c => `${c.nombre} · hace ${dias(c.ultima)} días`) });
    }
    if (masPedidos.length > 0) {
        hallazgos.push({ nivel: "dato", titulo: "Lo que más se mueve por mayor", items: masPedidos.slice(0, 3).map(x => `${x.nombre} · ${plural(x.n, "unidad", "unidades")}`) });
    }
    if (nunca.length > 0) {
        hallazgos.push({ nivel: "dato", titulo: `${plural(nunca.length, "mayorista nunca compró", "mayoristas nunca compraron")}`, items: nunca.slice(0, 3).map(m => m.usuario) });
    }
    if (hallazgos.length === 0) hallazgos.push({ nivel: "dato", titulo: "Todavía no hay ventas mayoristas para analizar" });

    const propuestas: Propuesta[] = [];
    if (pendientes > 0) propuestas.push({ impacto: "alto", titulo: pendientes === 1 ? "Respondé la solicitud de cuenta mayorista" : `Respondé las ${pendientes} solicitudes de cuenta mayorista`, porque: "Son revendedores que quieren empezar a comprarte." });
    if (dormidos.length > 0) propuestas.push({ impacto: "alto", titulo: `Escribile a ${lista(dormidos.map(c => c.nombre))}`, porque: `Te compraban y hace más de 45 días que no hacen un pedido. Preguntales cómo vienen y ofreceles una novedad.` });
    if (masPedidos.length > 1) propuestas.push({ impacto: "medio", titulo: `Armá un combo mayorista con ${lista(masPedidos.map(x => x.nombre))}`, porque: "Es lo que más se mueve por mayor: un combo hace que pidan más de una vez." });
    if (nunca.length > 0) propuestas.push({ impacto: "bajo", titulo: `Ofrecele un primer pedido con descuento a ${lista(nunca.map(m => m.usuario))}`, porque: "Tienen cuenta mayorista y todavía no te compraron." });
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Buscá nuevos revendedores", porque: "Hoy no hay nada pendiente con los que ya tenés." });

    const equipo: Equipo | null = dormidos.length > 0 ? {
        con: ["marketing"],
        motivo: "Hay revendedores que dejaron de comprar",
        propuesta: `Marketing arma una oferta mayorista para ${lista(dormidos.map(c => c.nombre))}.`,
    } : null;
    if (equipo) pasos.push("Llamé a Marketing para armar una oferta y recuperarlos.");

    const metricas: Metrica[] = [
        { etiqueta: "Vendido por mayor", valor: pesos(total90), detalle: "últimos 90 días", tono: "salvia" },
        { etiqueta: "Revendedores activos", valor: String(mejores.length), detalle: `de ${Math.max(mayoristas.length, clientes.length)}`, tono: "neutro" },
        { etiqueta: "Dejaron de comprar", valor: String(dormidos.length), detalle: "hace más de 45 días", tono: dormidos.length ? "arena" : "neutro" },
        { etiqueta: "Solicitudes", valor: String(pendientes), detalle: "sin responder", tono: pendientes ? "terracota" : "neutro" },
    ];
    pasos.push("Listo: te dejé a quién escribirle y qué ofrecer.");
    return {
        agente: "revendedores", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("revendedores", [
            `Sumó ${plural(pedidos.length, "pedido", "pedidos")} de ${plural(clientes.length, "revendedor", "revendedores")}.`,
            `Encontró ${dormidos.length} que dejaron de comprar y ${plural(pendientes, "solicitud pendiente", "solicitudes pendientes")}.`,
        ]),
    };
}

// ── Compras ──────────────────────────────────────────────────────────────────
const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

export function agenteCompras(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const precio100 = (e: Esencia) => Number(e.price100g) || (Number(e.price30g) > 0 ? (Number(e.price30g) / 30) * 100 : 0);

    // 1. Qué hay que comprar: insumos con 30 o menos y esencias con menos de 50 g
    type Item = { nombre: string; detalle: string; proveedor: string; urgente: boolean; estimado: number };
    const items: Item[] = [];
    for (const i of d.insumos.filter(i => i.qty <= 30)) {
        items.push({ nombre: i.name, detalle: `quedan ${i.qty} ${i.unit}`, proveedor: i.provider?.trim() || "Sin proveedor", urgente: i.qty <= 10, estimado: 0 });
    }
    for (const inv of d.inventario.filter(i => i.type === "Esencia" && i.qty < 50)) {
        const e = d.esencias.find(x => normalizar(x.name) === normalizar(inv.name));
        items.push({ nombre: inv.name, detalle: `quedan ${inv.qty} ${inv.unit || "g"}`, proveedor: e?.provider?.trim() || "Sin proveedor", urgente: inv.qty < 20, estimado: e ? precio100(e) : 0 });
    }
    const porProveedor = new Map<string, Item[]>();
    for (const it of items) porProveedor.set(it.proveedor, [...(porProveedor.get(it.proveedor) ?? []), it]);
    const proveedores = [...porProveedor.entries()].sort((a, b) => Number(b[1].some(i => i.urgente)) - Number(a[1].some(i => i.urgente)) || b[1].length - a[1].length);
    const estimado = items.reduce((a, i) => a + i.estimado, 0);
    pasos.push(`Junté lo que hay que reponer: ${plural(items.length, "cosa", "cosas")} de ${plural(proveedores.length, "proveedor", "proveedores")}.`);

    if (items.length > 0) {
        hallazgos.push({
            nivel: items.some(i => i.urgente) ? "urgente" : "atencion",
            titulo: "Tu lista de compras",
            detalle: estimado > 0 ? `Las esencias, de a 100 g, salen unos ${pesos(estimado)}.` : "Agrupada por proveedor.",
            items: proveedores.slice(0, 5).map(([prov, its]) => `${prov}: ${lista(its.map(i => i.nombre), 4)}${its.length > 4 ? "…" : ""}`),
            accion: { texto: "Ver insumos", href: "/insumos" },
        });
    } else {
        hallazgos.push({ nivel: "bien", titulo: "No hace falta comprar nada por ahora" });
    }

    // 2. Quién lo tiene más barato: la misma esencia en varios proveedores
    const porNombre = new Map<string, Esencia[]>();
    for (const e of d.esencias) {
        if (!(precio100(e) > 0) || !e.provider) continue;
        porNombre.set(normalizar(e.name), [...(porNombre.get(normalizar(e.name)) ?? []), e]);
    }
    const necesarias = new Set(items.map(i => normalizar(i.nombre)));
    const ahorros = [...porNombre.entries()]
        .filter(([, es]) => new Set(es.map(e => e.provider)).size > 1)
        .map(([n, es]) => {
            const o = [...es].sort((a, b) => precio100(a) - precio100(b));
            const barato = o[0], caro = o[o.length - 1];
            return { nombre: barato.name, barato, ahorro: 1 - precio100(barato) / precio100(caro), necesaria: necesarias.has(n) };
        })
        .filter(x => x.ahorro >= 0.1)
        .sort((a, b) => Number(b.necesaria) - Number(a.necesaria) || b.ahorro - a.ahorro);
    pasos.push(`Comparé precios entre proveedores: ${plural(ahorros.length, "esencia es", "esencias son")} bastante más barata${ahorros.length === 1 ? "" : "s"} en otro.`);
    if (ahorros.length > 0) {
        hallazgos.push({
            nivel: "dato",
            titulo: "Más barato en otro proveedor",
            items: ahorros.slice(0, 3).map(x => `${x.nombre} · en ${x.barato.provider} ${pesos(precio100(x.barato))} los 100 g · ${pct(x.ahorro)} menos`),
        });
    }

    // 3. Cuánto vas gastando (egresos de la Caja)
    const gastos = d.gastos ?? [];
    const enRango = (desde: number, hasta: number) => gastos.filter(g => {
        const t = (d.hoy.getTime() - g.fecha.getTime()) / DIA;
        return t >= hasta && t < desde;
    }).reduce((a, g) => a + g.monto, 0);
    const mes = enRango(30, 0), anterior = enRango(60, 30);
    const cambio = anterior > 0 ? (mes - anterior) / anterior : null;
    pasos.push(`Sumé los gastos de la Caja: ${pesos(mes)} en 30 días.`);
    if (cambio !== null && cambio >= 0.3) {
        hallazgos.push({ nivel: "atencion", titulo: `Gastaste ${pct(cambio)} más que el mes anterior`, detalle: `${pesos(mes)} contra ${pesos(anterior)}.`, accion: { texto: "Ir a Caja", href: "/caja" } });
    }
    const sinProveedor = items.filter(i => i.proveedor === "Sin proveedor");

    const propuestas: Propuesta[] = [];
    const [primero] = proveedores;
    if (primero && primero[0] !== "Sin proveedor") {
        propuestas.push({ impacto: primero[1].some(i => i.urgente) ? "alto" : "medio", titulo: `Hacé el pedido a ${primero[0]}`, porque: `Le tenés que comprar ${lista(primero[1].map(i => i.nombre), 4)}${primero[1].some(i => i.urgente) ? ", y algo está por terminarse" : ""}.` });
    }
    for (const x of ahorros.filter(a => a.necesaria).slice(0, 1)) {
        propuestas.push({ impacto: "medio", titulo: `Comprá ${x.nombre} a ${x.barato.provider}`, porque: `Lo tiene ${pct(x.ahorro)} más barato que otro proveedor.` });
    }
    if (cambio !== null && cambio >= 0.3) propuestas.push({ impacto: "medio", titulo: "Revisá en qué subieron los gastos", porque: `Este mes gastaste ${pct(cambio)} más que el anterior.`, accion: { texto: "Ir a Caja", href: "/caja" } });
    if (sinProveedor.length > 0) propuestas.push({ impacto: "bajo", titulo: `Cargá el proveedor de ${lista(sinProveedor.map(i => i.nombre))}`, porque: "Así la lista de compras sale armada por proveedor." });
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "No hace falta comprar nada esta semana", porque: "El stock de insumos y esencias está bien." });

    const metricas: Metrica[] = [
        { etiqueta: "Para comprar", valor: String(items.length), detalle: plural(proveedores.length, "proveedor", "proveedores"), tono: items.length ? "arena" : "neutro" },
        { etiqueta: "Esencias estimado", valor: estimado > 0 ? pesos(estimado) : "—", detalle: "de a 100 g", tono: "neutro" },
        { etiqueta: "Gastado (30 días)", valor: pesos(mes), detalle: cambio !== null ? `${cambio >= 0 ? "+" : ""}${pct(cambio)} vs mes anterior` : "egresos de la Caja", tono: cambio !== null && cambio >= 0.3 ? "terracota" : "neutro" },
        { etiqueta: "Ahorro posible", valor: String(ahorros.length), detalle: "esencias más baratas en otro", tono: ahorros.length ? "salvia" : "neutro" },
    ];
    pasos.push("Listo: te armé la lista de compras.");
    return {
        agente: "compras", pasos, metricas, hallazgos: ordenar(hallazgos), propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("compras", [
            `Armó la lista: ${plural(items.length, "cosa", "cosas")} de ${plural(proveedores.length, "proveedor", "proveedores")}.`,
            `Comparó proveedores: ${ahorros.length} con precio más bajo en otro.`,
        ]),
    };
}

// ── Tendencias ───────────────────────────────────────────────────────────────
export function agenteTendencias(d: Datos): Parcial {
    const pasos: string[] = [];
    const hallazgos: Hallazgo[] = [];
    const porId = new Map(d.productos.map(p => [p.id, p]));
    const ult30 = unidadesVendidas(d.ventas, d.hoy, 30);
    const ult90 = unidadesVendidas(d.ventas, d.hoy, 90);
    pasos.push(`Leí las ventas de los últimos 90 días: ${plural(ult90.size, "producto vendido", "productos vendidos")}.`);

    // Ritmo de los últimos 30 días contra el promedio mensual de los 60 anteriores
    const ritmo = [...ult90.entries()].map(([id, n90]) => {
        const n30 = ult30.get(id) ?? 0;
        const antes = (n90 - n30) / 2;
        return { id, p: porId.get(id), n30, antes };
    }).filter((x): x is { id: string; p: Producto; n30: number; antes: number } => !!x.p);
    const creciendo = ritmo.filter(x => x.n30 >= 2 && x.n30 >= x.antes * 1.5 + 1).sort((a, b) => (b.n30 - b.antes) - (a.n30 - a.antes));
    const frenados = ritmo.filter(x => x.antes >= 1 && x.n30 === 0).sort((a, b) => b.antes - a.antes);
    pasos.push(`Comparé el último mes con los anteriores: ${creciendo.length} vienen creciendo y ${frenados.length} se frenaron.`);

    // Familias de aromas, tamaños y géneros que más se eligen
    const familias = new Map<string, number>();
    const tamanos = new Map<string, number>();
    const generos = new Map<string, number>();
    let total = 0;
    for (const [id, n] of ult90) {
        const p = porId.get(id);
        if (!p || tipoDe(p) !== "perfumes") continue;
        total += n;
        const slug = slugDe({ name: p.name.trim(), category: p.category.trim(), gender: p.gender.trim() || "Unisex" });
        for (const f of d.familias?.get(slug) ?? []) familias.set(f, (familias.get(f) ?? 0) + n);
        const ml = p.category.match(/(\d+)\s*ml/i)?.[1];
        if (ml) tamanos.set(`${ml} ml`, (tamanos.get(`${ml} ml`) ?? 0) + n);
        if (p.gender) generos.set(p.gender, (generos.get(p.gender) ?? 0) + n);
    }
    const orden = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    const topFamilias = orden(familias), topTamanos = orden(tamanos), topGeneros = orden(generos);
    const parte = (n: number) => (total ? pct(n / total) : "—");
    pasos.push(`Miré qué aromas y tamaños se eligen: ${topFamilias[0] ? `manda ${topFamilias[0][0].toLowerCase()}` : "faltan notas cargadas para saberlo"}.`);

    if (creciendo.length > 0) {
        hallazgos.push({ nivel: "bien", titulo: "Vienen creciendo", detalle: "Se vendieron bastante más este mes que en los anteriores.", items: creciendo.slice(0, 3).map(x => `${nombreCorto(x.p)} · ${x.n30} este mes (antes ${Math.round(x.antes)} por mes)`) });
    }
    if (frenados.length > 0) {
        hallazgos.push({ nivel: "atencion", titulo: "Se frenaron", detalle: "Se vendían y este mes no se vendió ninguno.", items: frenados.slice(0, 3).map(x => `${nombreCorto(x.p)} · antes ${Math.round(x.antes)} por mes`) });
    }
    if (topFamilias.length > 0) {
        hallazgos.push({ nivel: "dato", titulo: "Los aromas que más se eligen", items: topFamilias.slice(0, 3).map(([f, n]) => `${f} · ${parte(n)} de lo vendido`) });
    }
    if (topTamanos.length > 0 || topGeneros.length > 0) {
        hallazgos.push({ nivel: "dato", titulo: "Tamaños y géneros", items: [...topTamanos.slice(0, 2).map(([t, n]) => `${t} · ${parte(n)}`), ...topGeneros.slice(0, 3).map(([g, n]) => `${g} · ${parte(n)}`)] });
    }
    if (hallazgos.length === 0) hallazgos.push({ nivel: "dato", titulo: "Todavía no hay ventas suficientes para ver tendencias" });

    const disponibilidad = calculadorDisponibilidad(d.inventario, d.esencias);
    const creciendoSinStock = creciendo.filter(x => disponibilidad(x.p).estado !== "disponible");
    const propuestas: Propuesta[] = [];
    if (creciendoSinStock.length > 0) propuestas.push({ impacto: "alto", titulo: `Prepará stock de ${lista(creciendoSinStock.map(x => nombreCorto(x.p)))}`, porque: "Se venden cada vez más y hoy no tenés hechos: no te quedes sin cuando llegue el pico." });
    else if (creciendo.length > 0) propuestas.push({ impacto: "medio", titulo: `Destacá ${lista(creciendo.map(x => nombreCorto(x.p)))}`, porque: "Vienen creciendo: ponelos primeros en el catálogo y en tus publicaciones." });
    if (topFamilias[0]) propuestas.push({ impacto: "medio", titulo: `Sumá más perfumes de la familia ${topFamilias[0][0].toLowerCase()}`, porque: `Es el ${parte(topFamilias[0][1])} de lo que vendés: tus clientes la buscan.` });
    if (frenados.length > 0) propuestas.push({ impacto: "medio", titulo: `Revisá por qué ${frenados.length === 1 ? "se frenó" : "se frenaron"} ${lista(frenados.map(x => nombreCorto(x.p)), 2)}`, porque: "Se vendían y este mes nada: puede ser precio, stock o que dejó de mostrarse." });
    if (topTamanos[0] && topTamanos.length > 1) propuestas.push({ impacto: "bajo", titulo: `Priorizá el tamaño de ${topTamanos[0][0]}`, porque: `Es el ${parte(topTamanos[0][1])} de lo vendido.` });
    if (propuestas.length === 0) propuestas.push({ impacto: "bajo", titulo: "Seguí cargando las ventas para ver tendencias", porque: "Con más ventas registradas se ve qué viene creciendo." });

    const equipo: Equipo | null = creciendoSinStock.length > 0 ? {
        con: ["reposicion"],
        motivo: "Hay perfumes que crecen y no tienen stock",
        propuesta: `Reposición prepara ${lista(creciendoSinStock.map(x => nombreCorto(x.p)))} antes de que se acumulen pedidos.`,
    } : null;
    if (equipo) pasos.push("Llamé a Reposición para preparar lo que viene creciendo.");

    const metricas: Metrica[] = [
        { etiqueta: "Creciendo", valor: String(creciendo.length), detalle: "este mes", tono: creciendo.length ? "salvia" : "neutro" },
        { etiqueta: "Se frenaron", valor: String(frenados.length), detalle: "sin ventas este mes", tono: frenados.length ? "arena" : "neutro" },
        { etiqueta: "Aroma preferido", valor: topFamilias[0]?.[0] ?? "—", detalle: topFamilias[0] ? `${parte(topFamilias[0][1])} de lo vendido` : "faltan notas", tono: "neutro" },
        { etiqueta: "Tamaño preferido", valor: topTamanos[0]?.[0] ?? "—", detalle: topTamanos[0] ? `${parte(topTamanos[0][1])} de lo vendido` : "", tono: "neutro" },
    ];
    pasos.push("Listo: te dejé hacia dónde van tus ventas.");
    return {
        agente: "tendencias", pasos, metricas, hallazgos: ordenar(hallazgos), equipo, propuestas: ordenarPropuestas(propuestas),
        asistentes: asistentes("tendencias", [
            `Encontró ${creciendo.length} creciendo y ${frenados.length} que se frenaron.`,
            topFamilias[0] ? `La familia que más se vende es ${topFamilias[0][0].toLowerCase()} (${parte(topFamilias[0][1])}).` : "No pudo ver familias: faltan notas cargadas.",
        ]),
    };
}

// Hasta 3 nombres separados por coma (para las propuestas)
const lista = (xs: string[], n = 3) => xs.slice(0, n).join(", ");
// Propuestas: de mayor a menor impacto, y no más de 4 para que se lean
export const ordenarPropuestas = (ps: Propuesta[]) => {
    const peso = { alto: 0, medio: 1, bajo: 2 } as const;
    return [...ps].sort((a, b) => peso[a.impacto] - peso[b.impacto]).slice(0, 4);
};

export const PESO: Record<Hallazgo["nivel"], number> = { urgente: 0, atencion: 1, bien: 2, dato: 3 };
const ordenar = (hs: Hallazgo[]) => [...hs].sort((a, b) => PESO[a.nivel] - PESO[b.nivel]);

export const TRABAJO: Record<IdAgenteServidor, (d: Datos) => Parcial> = {
    reposicion: agenteReposicion,
    ventas: agenteVentas,
    catalogo: agenteCatalogo,
    marketing: agenteMarketing,
    costos: agenteCostos,
    revendedores: agenteRevendedores,
    compras: agenteCompras,
    tendencias: agenteTendencias,
};
