import { NextResponse } from 'next/server';
import { esAdmin } from '@/lib/sesion';

export async function POST(request: Request) {
    // Solo el equipo con sesión iniciada puede usar esta ruta
    if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert to Base64 for local/database storage as a Supabase alternative
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

        return NextResponse.json({ url: dataUrl }, { status: 200 });
    } catch (e: any) {
        console.error('Server error during upload:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    // No-op since we are using Base64 now
    return NextResponse.json({ success: true }, { status: 200 });
}
