# Cambios en el Sistema de Devoluciones

## Resumen
Se separaron las devoluciones en dos categorías para mejor análisis:

1. **Devoluciones Generales**: Todos los motivos EXCEPTO "Me vencimiento"
2. **Devoluciones por Vencimiento**: Solo el motivo "Me vencimiento"

## Archivos Modificados

### 1. `src/pages/UploadExcel.jsx`
**Cambios principales:**
- Agregados 3 nuevos agregadores:
  - `expiryConceptsAggr`: Conceptos de vencimiento
  - `expiryDailyAggr`: Devoluciones por vencimiento diarias
  - `expiryClientReturnsAggr`: Devoluciones por vencimiento de clientes
  
- Lógica de separación:
  ```javascript
  const motivoLower = motivoStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esVencimiento = motivoLower.includes('vencimiento') || motivoLower.includes('me vencimiento');
  ```

- Retorna 3 nuevas propiedades:
  - `expiryConcepts`
  - `expiryDaily`
  - `expiryClientReturns`

### 2. `src/data/alpina-data.js`
**Cambios:**
- Agregadas 3 propiedades vacías al final:
  ```javascript
  "expiryConcepts": [],
  "expiryDaily": [],
  "expiryClientReturns": []
  ```

### 3. `src/utils/calculations.js`
**Cambios en `getFilteredData`:**
- Agregadas 3 nuevas variables para almacenar datos de vencimiento
- El retorno incluye las nuevas propiedades

### 4. `src/store/useStore.js`
**Cambios en `fetchDataFromSupabase`:**
- El objeto `newDbData` incluye las 3 nuevas propiedades con fallback a arrays vacíos desde `alpinaData`

### 5. `src/pages/ReturnsAnalysis.jsx`
**Cambios principales:**

#### KPIs actualizados (4 tarjetas):
1. **Devoluciones Generales** (naranja): Solo motivos generales
2. **Devoluciones por Vencimiento** (rojo oscuro): Solo vencimiento
3. **Total Devoluciones** (rojo): Suma de ambas
4. **Tasa de Devolución %**: Porcentaje sobre ventas totales

#### Nueva sección al final:
- **"Devoluciones por Vencimiento"**: Se muestra solo si `totalExpiryReturns > 0`
  - Tabla de clientes críticos por vencimiento
  - Métricas por concepto de vencimiento

## Detección de Vencimiento
El sistema detecta automáticamente motivos que contienen:
- "vencimiento" (sin importar mayúsculas/minúsculas ni acentos)
- "me vencimiento"

## Beneficios
1. **Mejor visibilidad**: Se pueden analizar por separado dos tipos de problemas diferentes
2. **Gestión específica**: Vencimiento requiere control de inventarios diferente a otros motivos
3. **Métricas más precisas**: KPIs separados para cada categoría
4. **Retrocompatibilidad**: Los archivos antiguos sin datos de vencimiento funcionan correctamente

## Próximos Pasos Sugeridos
- [ ] Crear tablas en Supabase para persistir datos de vencimiento
- [ ] Agregar gráficos específicos de tendencia de vencimiento
- [ ] Alertas automáticas cuando vencimiento supere umbral
- [ ] Dashboard de predicción de vencimiento por producto
