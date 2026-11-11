// Lee de la base todo lo que necesitan los agentes del negocio, ya en el formato de agentes.ts.
// Va aparte de agentes-actions.ts (que es "use server") para que no quede como acción que se pueda
// llamar desde el navegador: solo la usan las acciones que ya chequearon la sesión.
// Solo lee: ningún agente modifica la base.
import sql from './db';
import type { Datos } from './agentes';
import { leerInstagram } from './instagram';

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** instagram: además trae la cuenta de Instagram (solo la usa Marketing, si está conectada) */
export async function leerDatos({ instagram = false }: { instagram?: boolean } = {}): Promise<Datos> {
    const [productos, inventario, insumos, esencias, ordenes, notas, mayoristas, solicitudes, gastos, config, ig] = await Promise.all([
        sql`SELECT id, name, category, gender, cost, price, price_minorista, visible_catalogo, components,
                   (image_url LIKE '/api/foto/%') AS foto
            FROM productos`,
        sql`SELECT id, name, type, category, gender, qty, unit FROM inventario`,
        sql`SELECT id, name, qty, unit, provider, cost FROM insumos`,
        sql`SELECT id, name, price30g, price100g, cost, provider, qty, cost_usd, price100g_usd FROM esencias`,
        sql`SELECT id, items, total, status, payment_status, customer_name, date, created_at FROM orders`,
        sql`SELECT slug, familia FROM perfume_notas`.catch(() => []),
        // Solo el nombre de usuario y el estado de los mayoristas: nada de contraseñas ni mails
        sql`SELECT username, status FROM usuarios WHERE role = 'mayorista'`.catch(() => []),
        sql`SELECT count(*)::int AS n FROM solicitudes_mayorista WHERE estado = 'pendiente'`.catch(() => [{ n: 0 }]),
        sql`SELECT amount, description, created_at FROM transacciones
            WHERE type = 'Egreso' AND created_at > now() - interval '120 days'`.catch(() => []),
        sql`SELECT key, value FROM config WHERE key IN ('usd_rate', 'usd_last_update')`.catch(() => []),
        instagram ? leerInstagram() : Promise.resolve(null),
    ]);
    const conf = new Map((config as { key: string; value: string }[]).map(c => [c.key, c.value]));
    const dolar = num(conf.get('usd_rate'));
    return {
        productos: productos.map(p => ({
            id: String(p.id), name: String(p.name ?? '').trim(), category: String(p.category ?? '').trim(), gender: String(p.gender ?? '').trim(),
            cost: num(p.cost), price: num(p.price), priceMinorista: num(p.price_minorista),
            visible: p.visible_catalogo !== false, foto: !!p.foto,
            components: (Array.isArray(p.components) ? p.components : []).map((c: any) => ({ id: c?.id, name: c?.name, type: c?.type, qty: num(c?.qty) })),
        })),
        inventario: inventario.map(i => ({
            id: String(i.id), name: String(i.name ?? ''), type: String(i.type ?? ''), category: String(i.category ?? ''),
            gender: i.gender ? String(i.gender) : undefined, qty: num(i.qty), unit: String(i.unit ?? ''),
        })),
        insumos: insumos.map(i => ({
            id: String(i.id), name: String(i.name ?? ''), qty: num(i.qty), unit: String(i.unit ?? 'un.'),
            provider: i.provider ? String(i.provider) : undefined, cost: num(i.cost),
        })),
        esencias: esencias.map(e => ({
            id: String(e.id), name: String(e.name ?? ''), price30g: e.price30g, price100g: e.price100g, cost: e.cost,
            provider: e.provider ? String(e.provider) : undefined, qty: num(e.qty), enDolares: num(e.cost_usd) > 0 || num(e.price100g_usd) > 0,
        })),
        ventas: ordenes.map(o => {
            const fecha = new Date(String(o.date ?? ''));
            return {
                id: String(o.id),
                fecha: Number.isNaN(fecha.getTime()) ? new Date(o.created_at) : fecha,
                total: num(o.total),
                cobrada: o.payment_status === 'pagado',
                cancelada: o.status === 'cancelado',
                cliente: String(o.customer_name ?? 'Sin nombre'),
                items: (Array.isArray(o.items) ? o.items : []).map((it: any) => {
                    const p = it?.producto ?? {};
                    const lista = it?.priceType === 'minorista' ? p.priceMinorista : p.price;
                    return {
                        productoId: String(p.id ?? ''),
                        nombre: String(p.name ?? 'Producto'),
                        cantidad: num(it?.quantity) || 1,
                        precioUnitario: num(it?.customPrice) || num(lista),
                        mayorista: it?.priceType === 'mayorista',
                    };
                }),
            };
        }),
        slugsConNotas: new Set((notas as { slug: string }[]).map(n => String(n.slug))),
        familias: new Map((notas as { slug: string; familia: unknown }[]).map(n => [String(n.slug), Array.isArray(n.familia) ? n.familia.map(String) : []])),
        dolar: dolar > 0 ? { valor: dolar, actualizado: conf.get('usd_last_update') ?? null } : null,
        mayoristas: (mayoristas as { username: string; status: string }[]).map(m => ({ usuario: String(m.username ?? '').trim(), activo: m.status !== 'Inactivo' })),
        solicitudesPendientes: num((solicitudes as { n: number }[])[0]?.n),
        gastos: (gastos as { amount: number; description: string; created_at: string }[]).map(g => ({ fecha: new Date(g.created_at), monto: num(g.amount), descripcion: String(g.description ?? '') })),
        instagram: ig,
        hoy: new Date(),
    };
}
