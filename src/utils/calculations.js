import { alpinaData } from '../data/alpina-data';
import useStore from '../store/useStore';

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

export const calculateKPIs = (filteredData) => {
  const { providers, salesDaily, zones, returnsSellers, returnsDaily } = filteredData;

  // 1. Ventas Totales: si hay datos diarios (salesDaily) usamos la suma de "total", sino usamos los proveedores
  const hasDailySales = Array.isArray(salesDaily) && salesDaily.length > 0 && salesDaily.some(d => d.total && d.total > 0);
  const totalSales = hasDailySales
    ? salesDaily.reduce((sum, d) => sum + (d.total || 0), 0)
    : providers.reduce((sum, p) => sum + p.ventas2026, 0);

  // 2. Presupuesto: suma de zonas, o el presupuesto real del mes si no hay zonas
  const PRESUPUESTO_REAL_MES = 4001885288; // Junio 2026 — 22 días hábiles
  const totalBudget = zones.length > 0
    ? zones.reduce((sum, z) => sum + z.presupuesto, 0)
    : PRESUPUESTO_REAL_MES;

  // 3. Devoluciones: preferimos datos diarios, si no hay usamos devoluciones por vendedor, o estimación
  const dailyReturnsSum = Array.isArray(returnsDaily) ? returnsDaily.reduce((sum, d) => sum + (d.devoluciones || 0), 0) : 0;
  const sellersReturnsSum = Array.isArray(returnsSellers) ? returnsSellers.reduce((sum, s) => sum + (s.devoluciones || 0), 0) : 0;
  const totalReturns = dailyReturnsSum > 0 ? dailyReturnsSum : (sellersReturnsSum > 0 ? sellersReturnsSum : totalSales * 0.031);

  // 4. Ventas Netas: totalSales menos total returns
  const netSales = totalSales - totalReturns;

  // 5. Cumplimiento %: sales / budget
  const compliance = totalBudget > 0 ? totalSales / totalBudget : 0.973;

  // 6. Crecimiento (Growth) vs 2025
  const sales2025 = providers.reduce((sum, p) => sum + p.ventas2025, 0);
  const growth = sales2025 > 0 ? (totalSales - sales2025) / sales2025 : 0.2179;

  // 7. Ticket Promedio
  const totalFacturas = zones.reduce((sum, z) => sum + z.facturas, 0);
  const averageTicket = totalFacturas > 0 ? totalSales / totalFacturas : 375600;

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
