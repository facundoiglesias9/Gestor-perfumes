
'use server'

import sql from './db';

export async function fetchTable(tableName: string, options: any = {}) {
  try {
    const { orderBy, orderDir = 'asc', filter } = options;
    
    let query;
    if (filter) {
        const keys = Object.keys(filter);
        if (keys.length > 0) {
            query = sql`SELECT * FROM ${sql(tableName)} WHERE ${sql(filter)}`;
        } else {
            query = sql`SELECT * FROM ${sql(tableName)}`;
        }
    } else {
        query = sql`SELECT * FROM ${sql(tableName)}`;
    }

    if (orderBy) {
        // We use sql.unsafe for ASC/DESC because they are keywords, not values
        const direction = orderDir.toLowerCase() === 'desc' ? sql.unsafe('DESC') : sql.unsafe('ASC');
        query = sql`${query} ORDER BY ${sql(orderBy)} ${direction}`;
    }

    const data = await query;
    return { data, error: null };
  } catch (err: any) {
    console.error(`DB Error (fetchTable ${tableName}):`, err);
    return { data: null, error: err.message };
  }
}

export async function upsertRecord(tableName: string, record: any) {
  try {
    const columns = Object.keys(record);
    const updateColumns = columns.filter(c => c !== 'id');
    
    // Manual construction of the update set to be safe and compatible
    const result = await sql`
      INSERT INTO ${sql(tableName)} ${sql(record)}
      ON CONFLICT (id) DO UPDATE SET
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
    await sql`DELETE FROM ${sql(tableName)} WHERE id = ${id}`;
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
    const columns = Object.keys(records[0]);
    const updateColumns = columns.filter(c => c !== 'id');
    
    // Postgres library handles batch insert by passing an array
    const result = await sql`
      INSERT INTO ${sql(tableName)} ${sql(records)}
      ON CONFLICT (id) DO UPDATE SET
        ${sql(records[0], ...updateColumns)}
      RETURNING *
    `;
    return { data: result, error: null };
  } catch (err: any) {
    console.error(`DB Error (upsertRecords ${tableName}):`, err);
    return { data: null, error: err.message };
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
