const postgres = require('postgres');
require('dotenv').config({path: '.env.local'});
const sql = postgres(process.env.POSTGRES_URL);

async function check() {
    const res = await sql`SELECT * FROM esencias`;
    console.log('Total rows:', res.length);
    const manual = res.filter(x => (x.category || '').toLowerCase().includes('limpia') || (x.category || '').toLowerCase().includes('ambiente'));
    console.log('Manual items remaining:', manual.length);
    console.log(manual);
    process.exit(0);
}
check().catch(console.error);
