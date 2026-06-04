Procesador local de Excel (prototipo)

Instalación:

```bash
npm install xlsx @supabase/supabase-js
```

Uso (prueba local):

```bash
node scripts/process_excel.js path/to/archivo.xlsx
```

Salida:
- JSON por hoja en `./tmp_processed/`.

Siguientes pasos:
- Mapear campos JSON a las tablas SQL en `supabase/migrations/20260604_create_etl_tables.sql`.
- Cargar los JSON en Postgres (puedes usar `psql`, `pg` o `supabase-js`).
- Convertir este script a una Supabase Edge Function para ejecución automática al subir archivos.

Servidor de procesamiento (webhook)

1. Crear bucket en Supabase (usa `.env` con `SUPABASE_URL` y `SUPABASE_KEY`):

```bash
node scripts/create_bucket.js
```

2. Ejecutar servidor que procesa uploads (descarga el Excel, genera JSON por hoja y llama al loader):

```bash
npm install
node scripts/process_upload_server.js
```

3. Configurar la UI para subir: si has configurado `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`, la UI subirá las hojas al bucket `uploads`. Si además indicas `VITE_PROCESS_SERVER_URL` (por ejemplo `http://localhost:3001`), la UI llamará automáticamente a `/process` tras cada upload.

4. Para producción: despliega `process_upload_server.js` a Cloud Run o convierte a una Edge Function en Supabase (Deno). Asegúrate de que el servidor use la `service_role` key en `.env` para descargar desde Storage y escribir en la DB.

Loader (subir JSON procesado a Supabase)

1. Crea un fichero `.env` en la raíz con tus credenciales (ejemplo en `.env.example`).

```env
SUPABASE_URL=...
SUPABASE_KEY=...
```

2. Ejecuta el loader para upsert en las tablas definidas en la migración:

```bash
node scripts/load_to_db.js ./tmp_processed
```

Notas:
- El script intenta mapear archivos por nombre: `providers`, `zones`, `sales_daily`, `returns_sellers`.
- Para que `upsert` funcione correctamente crea índices únicos en Postgres sobre las columnas usadas como `onConflict` (p.ej. `proveedor`, `zona`, `fecha+proveedor+vendedor`).
- Para archivos muy grandes usa un servicio con más memoria o convierte a CSV y usa `COPY` para mejor rendimiento.
