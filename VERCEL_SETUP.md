# 🚀 Configuración de Variables de Entorno en Vercel

## Problema
Si después de hacer push a producción la aplicación se ve vacía pero en local funciona, es porque faltan las variables de entorno en Vercel.

---

## ✅ Solución Paso a Paso

### 1. Accede a tu Proyecto en Vercel
1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto **zentra-alpina** (o como lo hayas nombrado)

### 2. Configura las Variables de Entorno
1. Click en **Settings** (Configuración) en el menú superior
2. En el menú lateral izquierdo, click en **Environment Variables**
3. Agrega las siguientes variables una por una:

#### Variables Requeridas:

##### VITE_SUPABASE_URL
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://torxgpnqiezpnqqdomik.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

##### VITE_SUPABASE_ANON_KEY
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnhncG5xaWV6cG5xcWRvbWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MDk1ODksImV4cCI6MjA1MDQ4NTU4OX0.wg5kIgS5tEWH_2_pq5Yf5W1D8b7qWCqq3FUl0Q6gEYo`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

##### SUPABASE_URL (Para funciones serverless si las usas)
- **Name**: `SUPABASE_URL`
- **Value**: `https://torxgpnqiezpnqqdomik.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

##### SUPABASE_KEY (Opcional - Solo si usas funciones serverless)
- **Name**: `SUPABASE_KEY`
- **Value**: `tu-service-role-key` (busca en tu proyecto de Supabase)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Variables Opcionales (Para IA Gemini):

##### VITE_GEMINI_API_KEY
- **Name**: `VITE_GEMINI_API_KEY`
- **Value**: Tu API key de Google Gemini
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

##### GEMINI_API_KEY
- **Name**: `GEMINI_API_KEY`
- **Value**: Tu API key de Google Gemini
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

---

### 3. Redeploy la Aplicación
Después de agregar todas las variables:

1. Ve a la pestaña **Deployments** en tu proyecto
2. Encuentra el último deployment (el más reciente)
3. Click en los **tres puntos (...)** a la derecha
4. Selecciona **Redeploy**
5. Confirma el redeploy

### 4. Espera el Deploy
- El proceso toma aproximadamente 1-3 minutos
- Verás un indicador de progreso
- Cuando termine, aparecerá un ✅ verde

### 5. Verifica que Funcione
1. Click en el botón **Visit** o abre tu URL de producción
2. Verifica que:
   - Los datos se carguen correctamente
   - Los gráficos muestren información
   - No aparezcan "undefined" o campos vacíos

---

## 🔍 Cómo Obtener tus Claves de Supabase

Si no tienes las claves a mano:

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Click en **Settings** (⚙️) en el menú lateral
4. Click en **API**
5. Copia:
   - **Project URL** → Esta es tu `VITE_SUPABASE_URL`
   - **anon/public key** → Esta es tu `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (si la necesitas) → Esta es tu `SUPABASE_KEY`

---

## 📝 Notas Importantes

### Variables que empiezan con VITE_
- ✅ Estas son accesibles en el frontend (cliente)
- ✅ Se incluyen en el bundle de producción
- ✅ Son seguras para claves públicas (anon key)

### Variables sin VITE_
- ⚠️ Solo accesibles en el servidor (API routes, serverless functions)
- ⚠️ NO se incluyen en el bundle del cliente
- ⚠️ Usa estas para claves privadas (service_role key)

### Seguridad
- ✅ La `anon key` es segura para el frontend
- ⚠️ NUNCA expongas la `service_role key` en el frontend
- ✅ Configura Row Level Security (RLS) en Supabase para proteger tus datos

---

## 🐛 Troubleshooting

### Si después del redeploy sigue sin funcionar:

1. **Verifica la consola del navegador**
   - Abre DevTools (F12)
   - Ve a la pestaña Console
   - Busca errores de Supabase o de red

2. **Verifica que las variables se aplicaron**
   - En Vercel, ve a Settings → Environment Variables
   - Confirma que todas las variables estén ahí
   - Asegúrate de haber marcado "Production"

3. **Limpia la caché de Vercel**
   - En Deployments, haz Redeploy nuevamente
   - Esto fuerza una reconstrucción completa

4. **Verifica Supabase**
   - Ve a tu proyecto en Supabase
   - Confirma que las tablas tengan datos
   - Verifica que RLS esté configurado correctamente

5. **Revisa los logs de Vercel**
   - En tu deployment, click en "View Function Logs"
   - Busca errores relacionados con variables de entorno

---

## ✅ Checklist Final

Antes de considerar que todo está configurado:

- [ ] Agregué `VITE_SUPABASE_URL` en Vercel
- [ ] Agregué `VITE_SUPABASE_ANON_KEY` en Vercel
- [ ] Marqué todos los entornos (Production, Preview, Development)
- [ ] Hice redeploy del proyecto
- [ ] Verifiqué que los datos se cargan en producción
- [ ] No veo "undefined" ni campos vacíos
- [ ] Los gráficos muestran información correcta
- [ ] La consola del navegador no muestra errores

---

**Última actualización**: Junio 30, 2026  
**Estado**: Instrucciones completas  
**Autor**: Equipo Alpina BI
