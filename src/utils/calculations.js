import { alpinaData } from '../data/alpina-data';
import useStore from '../store/useStore';

// ─── Días hábiles oficiales por período — FUENTE ÚNICA ────────────────────
// Actualizar este mapa cada mes nuevo. Todos los archivos importan de aquí.
// Si un período no está en el mapa, el fallback es 23.
export const DIAS_HABILES_POR_PERIODO = {
  '2026-01': 21,
  '2026-02': 20,
  '2026-03': 22,
  '2026-04': 21,
  '2026-05': 21,
  '2026-06': 23,
  '2026-07': 23,
  '2026-08': 21,
  '2026-09': 22,
  '2026-10': 22,
  '2026-11': 21,
  '2026-12': 20,
};

/** Devuelve los días hábiles del período dado. Si no está en el mapa, cuenta días hábiles del mes. */
export const getDiasHabiles = (periodo) => {
  // Usar hasOwnProperty para evitar falsos negativos cuando el valor es 0
  // y trim() para tolerar espacios accidentales en el string del período
  const key = periodo ? String(periodo).trim() : '';
  if (Object.prototype.hasOwnProperty.call(DIAS_HABILES_POR_PERIODO, key)) {
    return DIAS_HABILES_POR_PERIODO[key];
  }
  // Fallback: contar lunes-viernes del mes calendario
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return 23;
  const [y, m] = key.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
};

// ─── Presupuesto total del canal por período — FUENTE ÚNICA ──────────────────
// Actualizar al inicio de cada mes. Todos los componentes importan de aquí.
// El valor es el presupuesto mensual total del canal Alpina Eje Cafetero.
export const PRESUPUESTO_CANAL_POR_PERIODO = {
  '2026-06': 4210000000,
  '2026-07': 4210000000,
  '2026-08': 4210000000,
  '2026-09': 4210000000,
  '2026-10': 4210000000,
  '2026-11': 4210000000,
  '2026-12': 4210000000,
};

/** Devuelve el presupuesto total del canal para el período dado. */
export const getPresupuestoCanalMes = (periodo) => {
  const key = periodo ? String(periodo).trim() : '';
  return PRESUPUESTO_CANAL_POR_PERIODO[key] ?? 4210000000;
};

// ─── Presupuesto por zona — FUENTE ÚNICA ─────────────────────────────────────
// Los valores son el presupuesto mensual asignado a cada zona.
// Si el presupuesto cambia por mes, agregar una clave por período aquí.
// Por ahora el presupuesto es el mismo todos los meses.
export const BUDGET_MAP_ZONAS = {
  // --- JUAN JOSE GUZMAN (Armenia/Pereira) ---
  'M9601': 108000000,
  'M9602': 115000000,
  'M9603': 112000000,
  'M9604': 107000000,
  'M9605': 115000000,
  'M9606':  89000000,
  'M9600':  60000000,
  'P7008':  79000000,
  'P7009':  72000000,
  'P7010':  65470534,
  // --- BIBIANA MONTOYA (Manizales/Pereira) ---
  'M9552': 104000000,
  'M9553': 105000000,
  'M9554': 119000000,
  'M9555': 113000000,
  'M9556': 112000000,
  'M9557': 201000000,
  'M9558': 126000000,
  'M9559': 144000000,
  'M9550':  69000000,
  'M9560':  84000000,
  'P7000':  59000000,
  'P7001':  72000000,
  'P7002': 106000000,
  'E7000':  10454052,
  // --- DIEGO GONZALEZ (Manizales/Pereira/Armenia) ---
  'M9453': 114000000,
  'M9454': 129000000,
  'M9455': 120000000,
  'M9456': 104000000,
  'M9457': 119000000,
  'M9458': 108000000,
  'M9459': 134000000,
  'M9460': 152000000,
  'M9461': 128000000,
  'P7004': 142000000,
  'P7005': 122000000,
  'P7006': 153000000,
  'P7007': 175000000,
  'M9450':  84000000,
  'M9451':  70000000,
  'E7001':   9075414,
};

/** Devuelve el presupuesto de una zona. Si no existe, estima desde ventas. */
export const getBudgetZona = (zona, ventasNetasFallback = 0) => {
  const key = zona ? String(zona).trim() : '';
  if (Object.prototype.hasOwnProperty.call(BUDGET_MAP_ZONAS, key)) {
    return BUDGET_MAP_ZONAS[key];
  }
  return ventasNetasFallback > 0 ? Math.round(ventasNetasFallback / 0.95) : 0;
};

// ─── Mapa oficial de zonas por ciudad (fuente: CUBO_DE_VENTAS) ─────────────
// MACRO_1 = Eje Armenia  |  MACRO_2 = Eje Manizales  |  MACRO_3 = Eje Pereira
export const ZONA_CIUDAD_MAP = {
  // ARMENIA
  M9601: 'ARMENIA', M9602: 'ARMENIA', M9603: 'ARMENIA',
  P7008: 'ARMENIA', P7009: 'ARMENIA',
  M9604: 'ARMENIA', // MONTENEGRO
  M9606: 'ARMENIA', // CALARCA
  M9605: 'ARMENIA', // GENOVA
  P7010: 'ARMENIA', // LA TEBAIDA
  M9600: 'ARMENIA', // SALENTO

  // MANIZALES
  E7000: 'MANIZALES',
  M9550: 'MANIZALES', M9552: 'MANIZALES', M9555: 'MANIZALES',
  M9556: 'MANIZALES', P7000: 'MANIZALES',
  M9559: 'MANIZALES', P7002: 'MANIZALES', // CHINCHINA
  M9553: 'MANIZALES', P7001: 'MANIZALES', // VILLAMARIA
  M9554: 'MANIZALES',                      // NEIRA
  M9557: 'MANIZALES',                      // RIOSUCIO
  M9558: 'MANIZALES',                      // SALAMINA
  M9560: 'MANIZALES',                      // SUPIA

  // PEREIRA
  M9453: 'PEREIRA', M9455: 'PEREIRA', M9456: 'PEREIRA',
  M9457: 'PEREIRA', M9459: 'PEREIRA', M9460: 'PEREIRA',
  P7004: 'PEREIRA',
  E7001: 'PEREIRA',                        // DOSQUEBRADAS - Servicio al cliente
  M9454: 'PEREIRA', M9458: 'PEREIRA',      // DOSQUEBRADAS
  M9450: 'PEREIRA', P7006: 'PEREIRA',      // LA VIRGINIA
  M9461: 'PEREIRA',                        // CARTAGO
  M9451: 'PEREIRA', P7007: 'PEREIRA',      // BELEN DE UMBRIA
  P7005: 'PEREIRA',                        // ANSERMANUEVO
};

export const SUPERMARKET_ZONES = [
  'M9450', 'M9451', 'M9550', 'M9560', 'M9600',
  'P7000', 'P7001', 'P7002', 'P7008', 'P7009', 'P7010',
];

export const SPECIAL_ZONES = ['E7000', 'E7001'];

// ─── Tasas por defecto de Cambio por Vencimiento por Zona ─────────────────
export const ZONE_DEFAULT_CAMBIO_RATES = {
  // Eje Pereira
  'M9453': 0.020,
  'M9454': 0.021,
  'M9455': 0.019,
  'M9456': 0.019,
  'M9457': 0.020,
  'M9458': 0.023,
  'M9459': 0.021,
  'M9460': 0.020,
  'M9461': 0.022,
  'P7004': 0.018,
  'P7005': 0.008,
  'P7006': 0.019,
  'P7007': 0.018,
  'M9450': 0.037,
  'M9451': 0.020,
  'E7001': 0.015,

  // Eje Caldas
  'M9552': 0.025,
  'M9553': 0.020,
  'M9554': 0.035,
  'M9555': 0.016,
  'M9556': 0.019,
  'M9557': 0.006,
  'M9558': 0.017,
  'M9559': 0.012,
  'M9550': 0.026,
  'M9560': 0.010,
  'P7000': 0.023,
  'P7001': 0.087,
  'P7002': 0.040,
  'E7000': 0.002,

  // Eje Quindío
  'M9601': 0.025,
  'M9602': 0.017,
  'M9603': 0.022,
  'M9604': 0.026,
  'M9605': 0.020,
  'M9606': 0.017,
  'M9600': 0.016,
  'P7008': 0.012,
  'P7009': 0.038,
  'P7010': 0.025
};

export const ZONE_TYPE_MAP = {
  // Supermercados
  'M9450': 'SUPERMERCADOS',
  'M9451': 'SUPERMERCADOS',
  'M9550': 'SUPERMERCADOS',
  'M9560': 'SUPERMERCADOS',
  'M9600': 'SUPERMERCADOS',
  'P7000': 'SUPERMERCADOS',
  'P7001': 'SUPERMERCADOS',
  'P7002': 'SUPERMERCADOS',
  'P7008': 'SUPERMERCADOS',
  'P7009': 'SUPERMERCADOS',
  'P7010': 'SUPERMERCADOS',
  // Zonas especiales
  'E7000': 'ZONAS ESPECIALES',
  'E7001': 'ZONAS ESPECIALES',
};

// Zonas que pertenecen a cada ciudad (para filtrado rápido)
export const ZONAS_POR_CIUDAD = {
  ARMENIA:   Object.entries(ZONA_CIUDAD_MAP).filter(([,c]) => c === 'ARMENIA').map(([z]) => z),
  MANIZALES: Object.entries(ZONA_CIUDAD_MAP).filter(([,c]) => c === 'MANIZALES').map(([z]) => z),
  PEREIRA:   Object.entries(ZONA_CIUDAD_MAP).filter(([,c]) => c === 'PEREIRA').map(([z]) => z),
};

export const DEFAULT_ZONE_SELLERS = {
  E7000: 'Servicio al Cliente (Manizales)',
  E7001: 'Servicio al Cliente (Pereira)',
  M9450: 'Estefanía Vanegas',
  M9451: 'Nini Foronda',
  M9453: 'Lina Cardona',
  M9454: 'Julián Galvis',
  M9455: 'Genny Marcela Gaviria',
  M9456: 'Eliana Sánchez',
  M9457: 'Germán Hurtado Torres',
  M9458: 'Natalia Díaz',
  M9459: 'Yudi Mondragón Segura',
  M9460: 'Alexander Orozco',
  M9461: 'Melissa Buitrago',
  M9550: 'Lina Guzmán',
  M9552: 'Viviana Vera',
  M9553: 'Sindy Amarís',
  M9554: 'Santiago Arcila',
  M9555: 'Janneth Betancourth',
  M9556: 'Diana Arango',
  M9557: 'Diana Milena Arango Arias',
  M9558: 'Beatriz Álvarez',
  M9559: 'Alejandro López',
  M9560: 'Eliana Calvo',
  M9600: 'Ángela Abello',
  M9601: 'Johanna Osorio',
  M9602: 'Daniel Montes',
  M9603: 'Lola Gaviria',
  M9604: 'Olga Mancera',
  M9605: 'John Garzón',
  M9606: 'Jeimy Trujillo',
  P7000: 'Karen Carvajal',
  P7001: 'Yeni Henao',
  P7002: 'Bladimir Hoyos',
  P7004: 'Valentina Guevara',
  P7005: 'Jhonier Alejandro Quintero',
  P7006: 'Cristian Grajales',
  P7007: 'Duberney Zapata',
  P7008: 'Sandra Cubillos',
  P7009: 'Yerina Guevara',
  P7010: 'Ángela González'
};
// ─────────────────────────────────────────────────────────────────────────────

const aggregateSalesDailyByDate = (list) => {
  const map = {};
  list.forEach(item => {
    if (!map[item.fecha]) {
      map[item.fecha] = { fecha: item.fecha, contado: 0, credito: 0, total: 0 };
    }
    map[item.fecha].contado += item.contado || 0;
    map[item.fecha].credito += item.credito || 0;
    map[item.fecha].total += item.total || 0;
  });
  return Object.values(map).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

const aggregateReturnsDailyByDate = (list) => {
  const map = {};
  list.forEach(item => {
    if (!map[item.fecha]) {
      map[item.fecha] = { fecha: item.fecha, devoluciones: 0 };
    }
    map[item.fecha].devoluciones += item.devoluciones || 0;
  });
  return Object.values(map).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
};

export const getFilteredData = (arg1, arg2) => {
  let dbData;
  let filters;

  if (arg2 === undefined) {
    filters = arg1;
    dbData = useStore.getState().dbData;
  } else {
    dbData = arg1;
    filters = arg2;
  }

  const baseData = dbData || alpinaData;
  if (!filters) filters = {};
  const {
    selectedProvider = 'Todas',
    selectedZone     = 'Todas',
    selectedSeller   = 'Todas',
    selectedCity     = 'Todas'
  } = filters;

  let providers      = [...(baseData.providers      || [])];
  let salesDaily     = [...(baseData.salesDaily     || [])];
  let zones          = [...(baseData.zones          || [])];
  let returnsSellers = [...(baseData.returnsSellers || [])];
  let returnsConcepts= [...(baseData.returnsConcepts|| [])];
  let returnsDaily   = [...(baseData.returnsDaily   || [])];
  let clientReturns  = [...(baseData.clientReturns  || [])];
  let expiryConcepts = [...(baseData.expiryConcepts || [])];
  let expiryDaily    = [...(baseData.expiryDaily    || [])];
  let expiryClientReturns = [...(baseData.expiryClientReturns || [])];

  // ── Filtro por CIUDAD (usando el mapa real de zonas del cubo) ──────────────
  if (selectedCity && selectedCity !== 'Todas') {
    const zonasPermitidas = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
    if (zonasPermitidas.size > 0) {
      zones          = zones.filter(z => zonasPermitidas.has(z.zona));
      returnsSellers = returnsSellers.filter(s => zonasPermitidas.has(s.ejecutivo));
      clientReturns  = clientReturns.filter(c => zonasPermitidas.has(c.ejecutivo));
      expiryClientReturns = expiryClientReturns.filter(c => zonasPermitidas.has(c.ejecutivo));
      
      // Filter daily lists by city zones if zone information is present
      if (salesDaily.some(d => d.zona)) {
        salesDaily = salesDaily.filter(d => d.zona && zonasPermitidas.has(d.zona));
      }
      if (returnsDaily.some(d => d.zona)) {
        returnsDaily = returnsDaily.filter(d => d.zona && zonasPermitidas.has(d.zona));
      }
      if (expiryDaily.some(d => d.zona)) {
        expiryDaily = expiryDaily.filter(d => d.zona && zonasPermitidas.has(d.zona));
      }
    }
  }

  // ── Filtro de proveedores Alpina ───────────────────────────────────────────
  // Los proveedores ya vienen filtrados del cubo (todos son ALPINA SA).
  // Mantener el filtro flexible por si hay otros cubos con más proveedores.
  providers = providers.filter(p =>
    p.proveedor.toUpperCase().includes('ALPINA') ||
    p.proveedor.toUpperCase().includes('BON YURT') ||
    p.proveedor.toUpperCase().includes('ALPIN') ||
    p.proveedor.toUpperCase().includes('YOGO') ||
    p.proveedor.toUpperCase().includes('YOX') ||
    (p.proveedorReal && p.proveedorReal.toUpperCase().includes('ALPINA'))
  );

  // ── Filtro por proveedor seleccionado ─────────────────────────────────────
  if (selectedProvider !== 'Todas') {
    providers = providers.filter(p =>
      p.proveedor.toLowerCase().includes(selectedProvider.toLowerCase()) ||
      selectedProvider.toLowerCase().includes(p.proveedor.toLowerCase())
    );
  }

  // ── Filtro por zona ───────────────────────────────────────────────────────
  if (selectedZone !== 'Todas') {
    zones = zones.filter(z => z.zona === selectedZone);
    if (salesDaily.some(d => d.zona)) {
      salesDaily = salesDaily.filter(d => d.zona === selectedZone);
    }
    if (returnsDaily.some(d => d.zona)) {
      returnsDaily = returnsDaily.filter(d => d.zona === selectedZone);
    }
    if (expiryDaily.some(d => d.zona)) {
      expiryDaily = expiryDaily.filter(d => d.zona === selectedZone);
    }
  }

  // ── Filtro por vendedor ───────────────────────────────────────────────────
  if (selectedSeller !== 'Todas') {
    zones          = zones.filter(z => z.vendedor === selectedSeller || z.zona === selectedSeller);
    returnsSellers = returnsSellers.filter(s =>
      s.nombre.toLowerCase().includes(selectedSeller.toLowerCase()) ||
      s.ejecutivo === selectedSeller
    );
    clientReturns  = clientReturns.filter(c =>
      c.ejecutivo === selectedSeller ||
      c.cliente.toLowerCase().includes(selectedSeller.toLowerCase())
    );
    expiryClientReturns = expiryClientReturns.filter(c =>
      c.ejecutivo === selectedSeller ||
      c.cliente.toLowerCase().includes(selectedSeller.toLowerCase())
    );

    const sellerZones = new Set(
      baseData.zones
        .filter(z => z.vendedor === selectedSeller || z.zona === selectedSeller)
        .map(z => z.zona)
    );
    if (sellerZones.size > 0) {
      if (salesDaily.some(d => d.zona)) {
        salesDaily = salesDaily.filter(d => d.zona && sellerZones.has(d.zona));
      }
      if (returnsDaily.some(d => d.zona)) {
        returnsDaily = returnsDaily.filter(d => d.zona && sellerZones.has(d.zona));
      }
      if (expiryDaily.some(d => d.zona)) {
        expiryDaily = expiryDaily.filter(d => d.zona && sellerZones.has(d.zona));
      }
    }
  }

  return { 
    providers, 
    salesDaily: aggregateSalesDailyByDate(salesDaily), 
    zones, 
    returnsSellers, 
    returnsConcepts, 
    returnsDaily: aggregateReturnsDailyByDate(returnsDaily), 
    clientReturns,
    expiryConcepts,
    expiryDaily: aggregateReturnsDailyByDate(expiryDaily),
    expiryClientReturns
  };
};

export const calculateKPIs = (filteredData, period) => {
  const { providers, salesDaily, zones, returnsSellers, returnsDaily, clientReturns, expiryClientReturns, expiryDaily } = filteredData;
  // Si no se pasa period, intentar inferirlo del store
  const activePeriod = period || (typeof useStore !== 'undefined' ? useStore.getState().selectedPeriod : null);

  // 1. Ventas Totales: si hay datos diarios (salesDaily) usamos la suma de "total", sino usamos los proveedores
  const hasDailySales = Array.isArray(salesDaily) && salesDaily.length > 0 && salesDaily.some(d => d.total && d.total > 0);
  let totalSales = hasDailySales
    ? salesDaily.reduce((sum, d) => sum + (d.total || 0), 0)
    : providers.reduce((sum, p) => sum + p.ventas2026, 0);

  // 2. Presupuesto: suma de zonas (fuente real), o el presupuesto del canal por período como fallback
  const totalBudget = zones.length > 0
    ? zones.reduce((sum, z) => sum + z.presupuesto, 0)
    : (totalSales > 0 ? getPresupuestoCanalMes(activePeriod) : 0);

  // 3. Devoluciones totales = Rechazos + Cambios (vencimientos)
  const clientReturnsSum  = Array.isArray(clientReturns)       ? clientReturns.reduce((sum, c) => sum + (c.valor || 0), 0) : 0;
  const expiryReturnsSum  = Array.isArray(expiryClientReturns) ? expiryClientReturns.reduce((sum, c) => sum + (c.valor || 0), 0) : 0;
  const dailyReturnsSum   = Array.isArray(returnsDaily)        ? returnsDaily.reduce((sum, d) => sum + (d.devoluciones || 0), 0) : 0;
  const expiryDailySum    = Array.isArray(expiryDaily)         ? expiryDaily.reduce((sum, d) => sum + (d.devoluciones || 0), 0) : 0;
  const sellersReturnsSum = Array.isArray(returnsSellers)      ? returnsSellers.reduce((sum, s) => sum + (s.devoluciones || 0), 0) : 0;
  const sellersRechazosSum = Array.isArray(returnsSellers)     ? returnsSellers.reduce((sum, s) => sum + (Number(s.rechazos) || 0), 0) : 0;
  const sellersCambiosSum  = Array.isArray(returnsSellers)     ? returnsSellers.reduce((sum, s) => sum + (Number(s.cambios)  || 0), 0) : 0;

  // 4. Devoluciones totales — fuente de mayor confianza disponible:
  //    a) rechazos + cambios separados en returnsSellers (nuevo — desde agosto 2026)
  //    b) devoluciones de returnsSellers (campo total)
  //    c) returns_daily (suma acumulada por día)
  //    d) fallback a cero si no hay datos
  let totalReturns;
  if (sellersRechazosSum > 0 && sellersCambiosSum > 0) {
    // Tenemos ambos campos separados: sumamos Rechazos + Cambios M.E.
    totalReturns = sellersRechazosSum + sellersCambiosSum;
  } else if (sellersRechazosSum > 0) {
    // Solo rechazos disponibles (cambios aún no están en la DB), usamos el total de sellers
    totalReturns = sellersReturnsSum > 0 ? sellersReturnsSum : sellersRechazosSum;
  } else if (sellersReturnsSum > 0) {
    // returnsSellers sin desglose
    totalReturns = sellersReturnsSum;
  } else if (dailyReturnsSum > 0) {
    // returnsDaily como fuente secundaria
    totalReturns = dailyReturnsSum + expiryDailySum;
  } else {
    // Sin datos en la DB — cero hasta que se cargue el cubo
    totalReturns = 0;
  }

  // 4b. Ventas netas dinámicas
  const netSales = totalSales - totalReturns;

  // 5. Cumplimiento %: netSales / budget
  const compliance = totalBudget > 0 ? netSales / totalBudget : 1.0815;

  // 6. Crecimiento (Growth) vs 2025
  const sales2025 = providers.reduce((sum, p) => sum + p.ventas2025, 0);
  const growth = sales2025 > 0 ? (totalSales - sales2025) / sales2025 : 0;

  // 7. Ticket Promedio
  const totalFacturas = zones.reduce((sum, z) => sum + z.facturas, 0);
  const averageTicket = totalFacturas > 0 ? totalSales / totalFacturas : 0;

  // 8. Mejor Vendedor
  let topSellerName = 'N/A';
  let topSellerVal = 0;
  const sellersData = returnsSellers.filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE');
  sellersData.forEach(s => {
    if (s.ventas > topSellerVal) {
      topSellerVal = s.ventas;
      topSellerName = s.nombre;
    }
  });

  // 9. Mejor Proveedor
  let topProviderName = 'N/A';
  let topProviderVal = 0;
  providers.forEach(p => {
    if (p.ventas2026 > topProviderVal) {
      topProviderVal = p.ventas2026;
      topProviderName = p.proveedor;
    }
  });

  // 10. Mejor Zona
  let topZoneName = 'N/A';
  let topZoneVal = 0;
  zones.forEach(z => {
    if (z.ventasNetas > topZoneVal) {
      topZoneVal = z.ventasNetas;
      topZoneName = z.zona;
    }
  });

  // 11. Rentabilidad (Weighted Margin)
  const totalMargenSales = providers.reduce((sum, p) => sum + (p.ventas2026 * p.margen2026), 0);
  const averageMargin = totalSales > 0 ? (totalMargenSales / totalSales) / 100 : 0.1262;

  return {
    totalSales,
    totalBudget,
    netSales,
    totalReturns,
    compliance,
    growth,
    averageTicket,
    topSeller: topSellerName,
    topProvider: topProviderName,
    topZone: topZoneName,
    profitability: averageMargin,
    totalFacturas: totalFacturas || 14233
  };
};

export const countCalendarBusinessDays = (salesDaily) => {
  if (!salesDaily || salesDaily.length === 0) return 1;
  const dates = salesDaily
    .filter(s => s && s.fecha && s.fecha !== 'general' && (Number(s.total || s.ventas || 0) > 0))
    .map(s => new Date(s.fecha && !s.fecha.includes('T') ? s.fecha + 'T00:00:00' : s.fecha))
    .filter(d => !isNaN(d.getTime()));
  if (dates.length === 0) return 1;
  dates.sort((a, b) => b - a);
  const maxDate = dates[0];
  const year = maxDate.getFullYear();
  const month = maxDate.getMonth();
  const monthStart = new Date(year, month, 1);
  let bDays = 0;
  const cur = new Date(monthStart);
  while (cur <= maxDate) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) { // Mon-Fri
      bDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return bDays || 1;
};

