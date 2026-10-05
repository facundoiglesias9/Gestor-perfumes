
import postgres from 'postgres';

// La dirección de la base se configura solo por variable de entorno (.env.local en tu compu,
// "Environment Variables" en Vercel). Nunca escribirla acá: este archivo se sube a git.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL con la dirección de la base de datos.');
}

// Una base en la misma compu (pruebas) no usa SSL; cualquier base en internet sí.
const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);

const sql = postgres(connectionString, {
  ssl: isLocal ? false : 'require',
  onnotice: () => {},
  transform: {
    undefined: null
  }
});

export default sql;
