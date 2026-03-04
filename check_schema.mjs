import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // try to select one row from bases
    const { data: bases, error } = await supabase.from('bases').select('*').limit(1);
    if (error) {
        console.error("Error fetching bases:", error);
    } else {
        if (bases && bases.length > 0) {
            console.log("Columns:", Object.keys(bases[0]));
        } else {
            console.log("No bases found or unknown columns");
        }
    }
}

checkSchema();
