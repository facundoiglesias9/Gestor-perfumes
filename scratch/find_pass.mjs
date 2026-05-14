
import postgres from 'postgres';

const connectionString = 'postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require';

const sql = postgres(connectionString, {
  ssl: 'require',
});

async function findPassword() {
  try {
    const users = await sql`SELECT * FROM usuarios WHERE username = 'facundo'`;
    console.log('Users found:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

findPassword();
