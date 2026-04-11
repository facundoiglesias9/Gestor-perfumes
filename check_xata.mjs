
import postgres from 'postgres';
const sql = postgres('postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require');

async function check() {
    try {
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('Tables in Xata:', tables.map(t => t.table_name));
    } catch (e) {
        console.error('Error checking tables:', e);
    } finally {
        await sql.end();
    }
}
check();
