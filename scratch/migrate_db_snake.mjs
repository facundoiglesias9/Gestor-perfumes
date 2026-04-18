
import postgres from 'postgres';

const connectionString = 'postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require';

const sql = postgres(connectionString, {
  ssl: 'require',
  onnotice: () => {},
});

async function migrate() {
  console.log('--- Corrigiendo Columnas a snake_case ---');
  try {
    // Check if columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'productos'
    `;
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('Columnas actuales:', existingColumns);

    // Add snake_case versions
    if (!existingColumns.includes('availability_status')) {
      console.log('Agregando columna availability_status...');
      await sql`ALTER TABLE productos ADD COLUMN availability_status TEXT DEFAULT 'disponible'`;
    }

    if (!existingColumns.includes('delivery_days')) {
      console.log('Agregando columna delivery_days...');
      await sql`ALTER TABLE productos ADD COLUMN delivery_days INTEGER DEFAULT 0`;
    }

    // Drop camelCase versions if they exist
    if (existingColumns.includes('availabilityStatus')) {
      console.log('Eliminando columna camelCase availabilityStatus...');
      await sql`ALTER TABLE productos DROP COLUMN "availabilityStatus"`;
    }
    if (existingColumns.includes('deliveryDays')) {
      console.log('Eliminando columna camelCase deliveryDays...');
      await sql`ALTER TABLE productos DROP COLUMN "deliveryDays"`;
    }

    console.log('✓ Migración completada con éxito');
    process.exit(0);
  } catch (err) {
    console.error('X Error durante la migración:', err);
    process.exit(1);
  }
}

migrate();
