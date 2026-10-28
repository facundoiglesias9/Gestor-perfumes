'use server'

// Notas olfativas de los perfumes, para verlas y editarlas desde el admin (Mi catálogo).
// Como cualquier acción de servidor, se puede llamar desde cualquier navegador: cada una
// revisa que haya una sesión de administrador antes de tocar la base.
import { revalidatePath } from 'next/cache';
import sql from './db';
import { esAdmin } from './sesion';
import { filaANotas, ACORDES, type NotasPerfume } from './catalogo-perfume';

const NO_AUTORIZADO = 'No autorizado: la sesión venció o no tiene permiso.';
const NOMBRES_ACORDES = new Set(ACORDES.map(a => a.nombre));

/** Todas las notas cargadas, por perfume (slug) */
export async function listarNotasPerfumes(): Promise<{ data: Record<string, NotasPerfume> | null; error: string | null }> {
  if (!(await esAdmin())) return { data: null, error: NO_AUTORIZADO };
  try {
    const rows = await sql`SELECT slug, familia, salida, corazon, fondo, descripcion, acordes FROM perfume_notas`;
    return { data: Object.fromEntries(rows.map(r => [String(r.slug), filaANotas(r)])), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Guarda las notas de un perfume (las crea si no tenía) y actualiza el catálogo enseguida */
export async function guardarNotasPerfume(slug: string, notas: NotasPerfume): Promise<{ error: string | null }> {
  if (!(await esAdmin())) return { error: NO_AUTORIZADO };
  const limpio = (s: unknown, max = 400) => String(s ?? '').trim().slice(0, max);
  const clave = limpio(slug, 120);
  if (!/^[a-z0-9-]+$/.test(clave)) return { error: 'Perfume inválido.' };

  const familia = (Array.isArray(notas.familia) ? notas.familia : []).map(f => limpio(f, 40)).filter(Boolean).slice(0, 4);
  // Barras: solo acordes conocidos, de 1 a 100; si no se ajustó ninguna, quedan en null (se calculan solas)
  const acordes = Array.isArray(notas.acordes)
    ? notas.acordes
        .filter(a => NOMBRES_ACORDES.has(a?.nombre))
        .map(a => ({ nombre: a.nombre, valor: Math.max(0, Math.min(100, Math.round(Number(a.valor) || 0))) }))
        .filter(a => a.valor > 0)
        .slice(0, 8)
    : [];

  try {
    await sql`
      INSERT INTO perfume_notas (slug, familia, salida, corazon, fondo, descripcion, acordes, updated_at)
      VALUES (${clave}, ${familia}, ${limpio(notas.salida)}, ${limpio(notas.corazon)}, ${limpio(notas.fondo)},
              ${limpio(notas.descripcion, 600)}, ${acordes.length > 0 ? sql.json(acordes) : null}, now())
      ON CONFLICT (slug) DO UPDATE SET
        familia = EXCLUDED.familia, salida = EXCLUDED.salida, corazon = EXCLUDED.corazon, fondo = EXCLUDED.fondo,
        descripcion = EXCLUDED.descripcion, acordes = EXCLUDED.acordes, updated_at = now()
    `;
    revalidatePath('/catalogo');
    revalidatePath('/catalogo/p/[slug]', 'page');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
