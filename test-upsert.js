require('dotenv').config({path: '.env.local'});
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function testBulk() {
    try {
        const records = Array.from({length: 300}).map((_, i) => ({
            id: `VR-TEST-BULK-${i}`,
            name: "Bulk Tester",
            category: "Perfumería Fina",
            gender: "Masculino",
            provider: "Van Rossum",
            cost: 15.5,
            qty: 1,
            price30g: 200,
            price100g: 500,
            price250g: null,
            price100g_usd: null,
            price250g_usd: null,
            last_update: "16/04/2026",
            source: "scraped"
        }));
        
        const tableName = "esencias";
        const columns = Object.keys(records[0]);
        const setClause = columns.filter(c => c !== 'id').map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');

        const result = await sql`
          INSERT INTO ${sql(tableName)} ${sql(records)}
          ON CONFLICT (id) DO UPDATE SET
            ${sql.unsafe(setClause)}
          RETURNING *
        `;
        console.log("SUCCESS:", result.length);

        // cleanup
        const ids = records.map(r => r.id);
        await sql`DELETE FROM esencias WHERE id IN ${sql(ids)}`;

    } catch (e) {
        console.log("PG ERROR CAUGHT:");
        console.log(e);
    }
    process.exit(0);
}

testBulk();
