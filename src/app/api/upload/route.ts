import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Supabase admin client with the service role key to bypass RLS policies
// This allows users to upload files without needing to configure Storage Policies manually
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

        // Upload the file as an ArrayBuffer since the Supabase client handles it better in Node.js
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data, error } = await supabaseServer.storage
            .from('productos')
            .upload(fileName, buffer, {
                contentType: file.type || 'image/jpeg',
                upsert: false
            });

        if (error) {
            console.error('Upload Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: publicData } = supabaseServer.storage
            .from('productos')
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicData.publicUrl }, { status: 200 });
    } catch (e: any) {
        console.error('Server error during upload:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const fileName = body.fileName;

        if (!fileName) {
            return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
        }

        const { error } = await supabaseServer.storage
            .from('productos')
            .remove([fileName]);

        if (error) {
            console.error('Delete Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e: any) {
        console.error('Server error during delete:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
