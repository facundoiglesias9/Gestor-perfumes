# Base de datos de Scenta

- `schema.sql`: las 13 tablas que usa la app (verificadas contra la base original de Xata). Se puede correr varias veces.
- `../scripts/exportar-base.mjs`: copia completa de la base actual a `respaldos/` (sirve también como backup periódico).
- `../scripts/migrar-base.mjs`: crea las tablas en una base nueva y carga los datos.

`respaldos/` está en `.gitignore`: los archivos tienen usuarios y contraseñas.

## Migrar a una base nueva (Neon)

1. Copia completa de la base actual (con `DATABASE_URL` todavía apuntando a la base vieja):
   ```
   node scripts/exportar-base.mjs
   ```
2. Crear un proyecto en https://neon.tech (plan Free), región **AWS South America East 1 (São Paulo)**,
   y copiar la "connection string" (empieza con `postgresql://`).
3. En `.env.local`, reemplazar el valor de `DATABASE_URL` por la connection string de Neon.
4. Probar sin escribir nada:
   ```
   node scripts/migrar-base.mjs --base respaldos/respaldo-base-AAAA-MM-DD.json
   ```
5. Cargar de verdad:
   ```
   node scripts/migrar-base.mjs --base respaldos/respaldo-base-AAAA-MM-DD.json --aplicar
   ```
6. En Vercel: Settings → Environment Variables → `DATABASE_URL` con la misma connection string, y volver a desplegar.

Si no hay copia completa, el script también acepta `--respaldo` (descargado de `/respaldo-local.html`)
y el Excel `Base_Datos_Scenta_Completa.xlsx`. Prioridad: copia de base > respaldo del navegador > Excel.
