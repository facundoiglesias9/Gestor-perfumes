import { NextResponse } from 'next/server';
import { esAdmin } from '@/lib/sesion';
// @ts-expect-error Types missing for pdf-parse exact lib path
import pdf from 'pdf-parse/lib/pdf-parse.js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // Solo el equipo con sesión iniciada puede usar esta ruta
    if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const data = await pdf(buffer);
        const text = data.text;

        const results = [];

        // Split by lines and parse
        const lines = text.split('\n');
        // Matches Name followed directly or closely by US$
        // e.g. "Ananá CayenaUS$4.32  US$9.60"
        const regex = /^(.+?)US\$([\d.,]+)\s*US\$([\d.,]+)/i;

        let lastName = "";

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Si la linea empieza con US$, es la continuación de la línea anterior
            if (line.toUpperCase().startsWith("US$") && lastName !== "") {
                line = lastName + " " + line;
            }

            const match = line.match(regex);
            if (match) {
                let name = match[1].trim();
                // Limpiar posibles cabeceras coladas
                name = name.replace(/ACEITES PUROS(?:GRAMOS| |)*$/i, '').trim();

                const price100 = parseFloat(match[2].replace(',', '.'));
                const price250 = parseFloat(match[3].replace(',', '.'));

                if (name && name.length > 0) {
                    results.push({
                        name,
                        price100gUsd: price100,
                        price250gUsd: price250
                    });
                }
                lastName = ""; // reset
            } else {
                if (line.length > 0 && !line.includes("GRAMOS") && !line.includes("FRAGANCIAS")) {
                    lastName = line; // Guarda la posible primera parte del nombre que se corto
                }
            }
        }

        return NextResponse.json({ success: true, count: results.length, data: results });
    } catch (e: any) {
        console.error("Error parsing PDF:", e);
        return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
    }
}
