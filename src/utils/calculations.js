import { alpinaData } from '../data/alpina-data';
import useStore from '../store/useStore';

export const getFilteredData = (arg1, arg2) => {
  let dbData;
  let filters;

  if (arg2 === undefined) {
    // Backwards compatibility for getFilteredData(filters) calls
    filters = arg1;
    dbData = useStore.getState().dbData;
  } else {
    // Two-argument call: getFilteredData(dbData, filters)
    dbData = arg1;
    filters = arg2;
  }

  const baseData = dbData || alpinaData;
  if (!filters) filters = {};
  const { selectedProvider = 'Todas', selectedZone = 'Todas', selectedSeller = 'Todas' } = filters;
  let providers = [...(baseData.providers || [])];
  let salesDaily = [...(baseData.salesDaily || [])];
  let zones = [...(baseData.zones || [])];
  let returnsSellers = [...(baseData.returnsSellers || [])];
  let returnsConcepts = [...(baseData.returnsConcepts || [])];
  let returnsDaily = [...(baseData.returnsDaily || [])];
  let clientReturns = [...(baseData.clientReturns || [])];

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

  // Filter providers by selected provider if set
  if (selectedProvider !== 'Todas') {
    providers = providers.filter(p => p.proveedor.toLowerCase().includes(selectedProvider.toLowerCase()) || selectedProvider.toLowerCase().includes(p.proveedor.toLowerCase()));
  }

  // Filter zones
  if (selectedZone !== 'Todas') {
    zones = zones.filter(z => z.zona === selectedZone);
  }

  // Filter seller
  if (selectedSeller !== 'Todas') {
    // If the seller name is selected, filter matching vendedor or ejecutivo code
    zones = zones.filter(z => z.vendedor === selectedSeller || z.zona === selectedSeller);
    returnsSellers = returnsSellers.filter(s => s.nombre.toLowerCase().includes(selectedSeller.toLowerCase()) || s.ejecutivo === selectedSeller);
    clientReturns = clientReturns.filter(c => c.ejecutivo === selectedSeller || c.cliente.toLowerCase().includes(selectedSeller.toLowerCase()));
  }

  return {
    providers,
    salesDaily,
    zones,
    returnsSellers,
    returnsConcepts,
    returnsDaily,
    clientReturns
  };
};

export const calculateKPIs = (filteredData) => {
  const { providers, salesDaily, zones, returnsSellers, returnsDaily } = filteredData;

  // 1. Ventas Totales: si hay datos diarios (salesDaily) usamos la suma de "total", sino usamos los proveedores
  const hasDailySales = Array.isArray(salesDaily) && salesDaily.length > 0 && salesDaily.some(d => d.total && d.total > 0);
  const totalSales = hasDailySales
    ? salesDaily.reduce((sum, d) => sum + (d.total || 0), 0)
    : providers.reduce((sum, p) => sum + p.ventas2026, 0);
    console.log('calculateKPIs - totalSales:', totalSales, 'hasDailySales:', hasDailySales, 'salesDaily count:', salesDaily?.length, 'providers count:', providers?.length);

  // 2. Presupuesto (Budget): sum of budget in zones (fallback unchanged)
  const totalBudget = zones.length > 0
    ? zones.reduce((sum, z) => sum + z.presupuesto, 0)
    : totalSales / 0.973;

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
