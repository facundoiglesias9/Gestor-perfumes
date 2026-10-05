
'use server'

import sql from './db';

export async function fetchTable(tableName: string, options: any = {}, retries = 1): Promise<any> {
  try {
    const { orderBy, orderDir = 'asc', filter, columns = '*' } = options;
    
    let query;
    const selectClause = Array.isArray(columns) ? sql(columns) : sql.unsafe(columns);
    
    if (filter) {
        const keys = Object.keys(filter);
        if (keys.length > 0) {
            const conditions = Object.keys(filter).map(key => sql`${sql(key)} = ${filter[key]}`);
            const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);
            query = sql`SELECT ${selectClause} FROM ${sql(tableName)} WHERE ${whereClause}`;
        } else {
            query = sql`SELECT ${selectClause} FROM ${sql(tableName)}`;
        }
    } else {
        query = sql`SELECT ${selectClause} FROM ${sql(tableName)}`;
    }

    if (orderBy) {
        // We use sql.unsafe for ASC/DESC because they are keywords, not values
        const direction = orderDir.toLowerCase() === 'desc' ? sql.unsafe('DESC') : sql.unsafe('ASC');
        query = sql`${query} ORDER BY ${sql(orderBy)} ${direction}`;
    }

    const data = await query;
    return { data, error: null };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    if (errorMsg.toLowerCase().includes("hibernated") && retries > 0) {
        console.warn(`Database hibernated. Retrying fetchTable(${tableName}) in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchTable(tableName, options, retries - 1);
    }
    console.error(`DB Error (fetchTable ${tableName}):`, err);
    return { data: null, error: errorMsg };
  }
}

// Varias consultas en un solo viaje al servidor. Next.js ejecuta las server actions de a una
// (en fila), así que pedir cada tabla por separado suma los tiempos; acá corren en paralelo.
export async function fetchTables(requests: { table: string; options?: any }[]): Promise<any[]> {
  return Promise.all(requests.map(r => fetchTable(r.table, r.options ?? {})));
}

export async function upsertRecord(tableName: string, record: any) {
  try {
    const columns = Object.keys(record);
    const conflictCol = tableName === 'config' ? 'key' : 'id';
    const updateColumns = columns.filter(c => c !== conflictCol);
    
    const result = await sql`
      INSERT INTO ${sql(tableName)} ${sql(record)}
      ON CONFLICT (${sql(conflictCol)}) DO UPDATE SET
        ${sql(record, ...updateColumns)}
      RETURNING *
    `;
    return { data: result[0], error: null };
  } catch (err: any) {
    console.error(`DB Error (upsertRecord ${tableName}):`, err);
    return { data: null, error: err.message };
  }
}

export async function deleteRecord(tableName: string, id: string | number) {
  try {
    const conflictCol = tableName === 'config' ? 'key' : 'id';
    await sql`DELETE FROM ${sql(tableName)} WHERE ${sql(conflictCol)} = ${id}`;
    return { error: null };
  } catch (err: any) {
    console.error(`DB Error (deleteRecord ${tableName}):`, err);
    return { error: err.message };
  }
}

export async function clearTable(tableName: string) {
  try {
    await sql`DELETE FROM ${sql(tableName)}`;
    return { error: null };
  } catch (err: any) {
    console.error(`DB Error (clearTable ${tableName}):`, err);
    return { error: err.message };
  }
}

export async function upsertRecords(tableName: string, records: any[]) {
  if (!records || records.length === 0) return { error: null };
  try {
    const conflictCol = tableName === 'config' ? 'key' : 'id';
    const columns = Object.keys(records[0]);
    const updateColumns = columns.filter(c => c !== conflictCol);
    // Use quotes and handle potential keywords by mapping
    const setClause = updateColumns.map(col => `"${col}" = EXCLUDED."${col}"`).join(', ');

    const results = [];
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);
      const res = await sql`
        INSERT INTO ${sql(tableName)} ${sql(chunk)}
        ON CONFLICT (${sql(conflictCol)}) DO UPDATE SET
          ${sql.unsafe(setClause)}
        RETURNING *
      `;
      results.push(...res);
    }
    return { data: results, error: null };
  } catch (err: any) {
    if (err.severity_local) {
      console.error(`DB Error (upsertRecords ${tableName}):`, { message: err.message, code: err.code, position: err.position, routine: err.routine });
      return { data: null, error: err.message || err.code || "PostgresError" };
    }
    console.error(`DB Error (upsertRecords ${tableName}):`, String(err));
    return { data: null, error: String(err) };
  }
}

export async function deleteRecords(tableName: string, ids: string[]) {
    if (!ids || ids.length === 0) return { error: null };
    try {
        await sql`DELETE FROM ${sql(tableName)} WHERE id IN ${sql(ids)}`;
        return { error: null };
    } catch (err: any) {
        console.error(`DB Error (deleteRecords ${tableName}):`, err);
        return { error: err.message };
    }
}
