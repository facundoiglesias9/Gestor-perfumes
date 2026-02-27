require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanIds() {
    console.log("Fetching insumos...");
    const { data: insumos, error } = await sb.from('insumos').select('*');

    if (error) {
        console.error("Error fetching insumos:", error);
        return;
    }

    let maxNum = 0;
    // Find current max 3-digit ID
    for (const ins of insumos) {
        if (ins.id.match(/^I-\d{3}$/)) {
            const num = parseInt(ins.id.replace('I-', ''), 10);
            if (num > maxNum) maxNum = num;
        }
    }

    // Update long IDs
    for (const ins of insumos) {
        if (ins.id.length > 5) { // e.g. I-1771966556582
            maxNum++;
            const newId = `I-${String(maxNum).padStart(3, '0')}`;
            console.log(`Migrating ${ins.name} from ${ins.id} to ${newId}`);

            // Insert with new ID
            const newIns = { ...ins, id: newId };
            const { error: insertErr } = await sb.from('insumos').insert(newIns);
            if (insertErr) {
                console.error("Error inserting:", insertErr);
                continue;
            }

            // Delete old ID
            const { error: deleteErr } = await sb.from('insumos').delete().eq('id', ins.id);
            if (deleteErr) {
                console.error("Error deleting:", deleteErr);
            }
        }
    }

    console.log("Cleanup complete.");
}

cleanIds();
