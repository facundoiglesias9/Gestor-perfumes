
import postgres from 'postgres';

const SUPABASE_URL = 'https://yomgpeherwpqtslegjcb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbWdwZWhlcndwcXRzbGVnamNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3ODI5OSwiZXhwIjoyMDg3NDU0Mjk5fQ.RQ6QAWGFHYq_XGZQL8nl07Vd4rtxuRWV3iMxyjHZat0';
const XATA_URL = 'postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require';

const sql = postgres(XATA_URL);

const tables = [
    'categorias',
    'proveedores',
    'esencias',
    'insumos',
    'inventario',
    'transacciones',
    'bases',
    'usuarios',
    'productos',
    'promociones',
    'orders',
    'solicitudes_mayorista'
];

async function migrate() {
    console.log('Starting migration...');

    for (const table of tables) {
        console.log(`Migrating table: ${table}...`);
        
        try {
            // 1. Fetch data from Supabase via PostgREST
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (!response.ok) {
                console.error(`Error fetching ${table}: ${response.statusText}`);
                continue;
            }

            const data = await response.json();
            console.log(`Fetched ${data.length} rows for ${table}`);

            if (data.length === 0) {
                console.log(`Table ${table} is empty in Supabase. Creating with default schema...`);
                // Schema fallback for known tables that might be empty
                let schema = '"id" TEXT PRIMARY KEY';
                if (table === 'promociones') {
                    schema = '"id" TEXT PRIMARY KEY, "product_id" TEXT, "discount_percentage" NUMERIC, "is_active" BOOLEAN, "end_date" TEXT';
                }
                await sql.unsafe(`CREATE TABLE IF NOT EXISTS "${table}" (${schema})`);
                continue;
            }

            // 2. Clear table in Xata
            await sql.unsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            
            const columns = Object.keys(data[0]);
            const createCols = columns.map(col => {
                const val = data[0][col];
                let type = 'TEXT';
                if (typeof val === 'number') type = 'NUMERIC';
                if (typeof val === 'boolean') type = 'BOOLEAN';
                if (val && typeof val === 'object') type = 'JSONB';
                if (col === 'id') type = 'TEXT PRIMARY KEY';
                return `"${col}" ${type}`;
            }).join(', ');

            await sql.unsafe(`CREATE TABLE "${table}" (${createCols})`);

            // 3. Batch Insert data
            console.log(`Inserting ${data.length} rows into ${table}...`);
            
            const chunkSize = 100;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await sql`INSERT INTO ${sql(table)} ${sql(chunk)}`;
            }
            
            console.log(`Table ${table} migrated successfully.`);
        } catch (err) {
            console.error(`Failed to migrate ${table}:`, err);
        }
    }

    console.log('Migration finished.');
    process.exit(0);
}

migrate();
