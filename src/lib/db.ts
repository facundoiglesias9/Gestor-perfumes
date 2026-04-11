
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require';

const sql = postgres(connectionString, {
  ssl: 'require',
  onnotice: () => {},
  transform: {
    undefined: null
  }
});

export default sql;
