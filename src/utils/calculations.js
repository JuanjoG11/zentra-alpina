import { alpinaData } from '../data/alpina-data';

export const getFilteredData = (filters) => {
  const { selectedPeriod, selectedCity, selectedZone, selectedProvider, selectedSeller } = filters;
  
  let providers = [...alpinaData.providers];
  let salesDaily = [...alpinaData.salesDaily];
  let zones = [...alpinaData.zones];
  let returnsSellers = [...alpinaData.returnsSellers];
  let returnsConcepts = [...alpinaData.returnsConcepts];
  let returnsDaily = [...alpinaData.returnsDaily];
  let clientReturns = [...alpinaData.clientReturns];

  // Keep only Alpina brands across the application
  providers = providers.filter(p => p.proveedor.toUpperCase().includes('ALPINA'));

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
  const { providers, salesDaily, zones, returnsSellers } = filteredData;

  // 1. Ventas Totales: sum of 2026 sales in providers
  const totalSales = providers.reduce((sum, p) => sum + p.ventas2026, 0);

  // 2. Presupuesto (Budget): sum of budget in zones
  // If zones is empty because we filtered by a specific provider, fallback to totalSales / 0.973
  const totalBudget = zones.length > 0 
    ? zones.reduce((sum, z) => sum + z.presupuesto, 0)
    : totalSales / 0.973;

  // 3. Devoluciones
  // If returnsSellers is empty because of filters, we can estimate or sum what's left
  const totalReturns = returnsSellers.length > 0
    ? returnsSellers.reduce((sum, s) => sum + s.devoluciones, 0)
    : totalSales * 0.031; // Estimate 3.1% if missing

  // 4. Ventas Netas: totalSales minus total returns
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
