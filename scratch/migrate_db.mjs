
import postgres from 'postgres';

const connectionString = 'postgresql://xata:qrJzhIuLKaTT945jkfxsgAhImVJxitzTJX9Vv2NS8v7sST1irFssHXwcTqWZi88y@rm9kqptn4p4lr3igiv26sl8lsc.us-east-1.xata.tech/xata?sslmode=require';

const sql = postgres(connectionString, {
  ssl: 'require',
  onnotice: () => {},
});

async function migrate() {
  console.log('--- Migrando Base de Datos ---');
  try {
    // Check if columns exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'productos'
    `;
    
    const existingColumns = columns.map(c => c.column_name);
    console.log('Columnas actuales:', existingColumns);

    if (!existingColumns.includes('availabilityStatus')) {
      console.log('Agregando columna availabilityStatus...');
      await sql`ALTER TABLE productos ADD COLUMN "availabilityStatus" TEXT DEFAULT 'disponible'`;
    }

    if (!existingColumns.includes('deliveryDays')) {
      console.log('Agregando columna deliveryDays...');
      await sql`ALTER TABLE productos ADD COLUMN "deliveryDays" INTEGER DEFAULT 0`;
    }

    console.log('✓ Migración completada con éxito');
    process.exit(0);
  } catch (err) {
    console.error('X Error durante la migración:', err);
    process.exit(1);
  }
}

migrate();
