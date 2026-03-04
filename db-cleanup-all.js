require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tablesToClean = [
    { name: 'categorias', prefix: 'C-' },
    { name: 'esencias', prefix: 'E-' },
    { name: 'insumos', prefix: 'I-' },
    { name: 'proveedores', prefix: 'P-' },
    { name: 'transacciones', prefix: 'T-' },
    { name: 'bases', prefix: 'B-' },
    { name: 'productos', prefix: 'PROD-' },
    { name: 'inventario', prefix: 'INV-' },
    { name: 'orders', prefix: 'ORD-' }
];

const idMap = {}; // oldId -> newId

async function cleanIds() {
    // Phase 1: Rename the main rows and populate idMap
    for (const tableConfig of tablesToClean) {
        const { name: tableName, prefix } = tableConfig;
        console.log(`\nFetching ${tableName}...`);
        const { data: rows, error } = await sb.from(tableName).select('*');

        if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            continue;
        }

        let maxNum = 0;
        const regex = new RegExp(`^${prefix}\\d{3}$`);
        for (const row of rows) {
            if (row.id && row.id.match(regex)) {
                const num = parseInt(row.id.replace(prefix, ''), 10);
                if (num > maxNum) maxNum = num;
            }
        }

        for (const row of rows) {
            if (row.id && row.id.length > prefix.length + 3) {
                maxNum++;
                const newId = `${prefix}${String(maxNum).padStart(3, '0')}`;
                idMap[row.id] = newId;
                console.log(`Map: ${row.id} -> ${newId}`);

                const newRow = { ...row, id: newId };
                const { error: insertErr } = await sb.from(tableName).insert(newRow);
                if (insertErr) {
                    console.error(`Error inserting ${tableName}:`, insertErr);
                } else {
                    const { error: deleteErr } = await sb.from(tableName).delete().eq('id', row.id);
                    if (deleteErr) console.error(`Error deleting ${tableName} ${row.id}:`, deleteErr);
                }
            }
        }
    }

    // Phase 2: Update references in bases, productos, orders
    console.log("\nUpdating references...");

    // Update Bases
    const { data: bases } = await sb.from('bases').select('*');
    for (const base of (bases || [])) {
        let changed = false;
        const newComponents = (base.components || []).map(comp => {
            if (idMap[comp.id]) {
                changed = true;
                return { ...comp, id: idMap[comp.id] };
            }
            return comp;
        });
        if (changed) {
            await sb.from('bases').update({ components: newComponents }).eq('id', base.id);
            console.log(`Updated references in base ${base.id}`);
        }
    }

    // Update Productos
    const { data: productos } = await sb.from('productos').select('*');
    for (const prod of (productos || [])) {
        let changed = false;
        let newBaseId = prod.base_id;
        if (idMap[prod.base_id]) {
            newBaseId = idMap[prod.base_id];
            changed = true;
        }
        const newComponents = (prod.components || []).map(comp => {
            if (idMap[comp.id]) {
                changed = true;
                return { ...comp, id: idMap[comp.id] };
            }
            return comp;
        });
        if (changed) {
            await sb.from('productos').update({ base_id: newBaseId, components: newComponents }).eq('id', prod.id);
            console.log(`Updated references in producto ${prod.id}`);
        }
    }

    // Update Orders
    const { data: orders } = await sb.from('orders').select('*');
    for (const order of (orders || [])) {
        let changed = false;
        const newItems = (order.items || []).map(item => {
            if (item.producto && idMap[item.producto.id]) {
                changed = true;
                return { ...item, producto: { ...item.producto, id: idMap[item.producto.id] } };
            }
            return item;
        });
        if (changed) {
            await sb.from('orders').update({ items: newItems }).eq('id', order.id);
            console.log(`Updated references in order ${order.id}`);
        }
    }

    console.log("\nCleanup complete.");
}

cleanIds();
