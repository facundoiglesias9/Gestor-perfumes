import { NextRequest, NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { MercadoPagoConfig } from "mercadopago";

export async function POST(req: NextRequest) {
    try {
        const { items, accessToken, customerName } = await req.json();

        if (!accessToken) {
            return NextResponse.json({ error: "No Access Token provided" }, { status: 400 });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: items.map((item: any) => ({
                    title: item.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    currency_id: "ARS",
                })),
                back_urls: {
                    success: `https://gestor-perfumes-six.vercel.app/pedidos-solicitud`,
                    failure: `https://gestor-perfumes-six.vercel.app/pedidos-solicitud`,
                    pending: `https://gestor-perfumes-six.vercel.app/pedidos-solicitud`,
                },
                auto_return: "approved",
                external_reference: `Order-${Date.now()}`,
                metadata: {
                    customer_name: customerName,
                }
            }
        });

        // The preference has an init_point (link to pay)
        // We can use this to generate a QR on the fly or just link to it.
        return NextResponse.json({
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point
        });
    } catch (error: any) {
        console.error("MP Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
