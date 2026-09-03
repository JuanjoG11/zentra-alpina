import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP, ZONE_TYPE_MAP, ZONE_DEFAULT_CAMBIO_RATES, countCalendarBusinessDays, getDiasHabiles } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency, formatCurrencyWithDecimals } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIAreaChart, BIStackedBarChart, BILineChart } from '../components/charts/BICharts';
import { TrendingUp, ArrowUpRight, MapPin } from 'lucide-react';

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',  bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700'    },
  MANIZALES: { label: 'Eje Caldas',   bg: 'bg-indigo-50 border border-indigo-200',  text: 'text-indigo-700'  },
  ARMENIA:   { label: 'Eje Quindío',  bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700' },
  OTRO:      { label: 'Otro',         bg: 'bg-slate-100 border border-slate-200',   text: 'text-slate-600'   },
};

const CityBadge = ({ zona }) => {
  const city = ZONA_CIUDAD_MAP[zona] || 'OTRO';
  const m = CITY_META[city] || CITY_META.OTRO;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${m.bg} ${m.text}`}>
      <MapPin className="h-2.5 w-2.5" />{m.label}
    </span>
  );
};

const SalesAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const currentWorkDay = useStore(state => state.currentWorkDay);
  const selectedPeriod = useStore(state => state.selectedPeriod);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

const channelTicket = React.useMemo(() => {
  const sums = {
    SUPERMERCADOS: { sales: 0, facturas: 0 },
    TAT: { sales: 0, facturas: 0 },
    'ZONAS ESPECIALES': { sales: 0, facturas: 0 }
  };
  filteredData.zones.forEach(z => {
    const type = ZONE_TYPE_MAP[z.zona] || 'TAT';
    if (sums[type]) {
      sums[type].sales += z.ventasNetas || 0;
      sums[type].facturas += z.facturas || 0;
    }
  });
  return {
    SUPERMERCADOS: sums.SUPERMERCADOS.facturas ? Math.round(sums.SUPERMERCADOS.sales / sums.SUPERMERCADOS.facturas) : 0,
    TAT: sums.TAT.facturas ? Math.round(sums.TAT.sales / sums.TAT.facturas) : 0,
    'ZONAS ESPECIALES': sums['ZONAS ESPECIALES'].facturas ? Math.round(sums['ZONAS ESPECIALES'].sales / sums['ZONAS ESPECIALES'].facturas) : 0
  };
}, [filteredData.zones]);


  // Sorting state for Pareto Table — Default sort: Zona Ascending (9450, 9451, 9452...)
  const [sortField, setSortField] = React.useState('zona');
  const [sortOrder, setSortOrder] = React.useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'zona' ? 'asc' : 'desc');
    }
  };

  // 1. Calculate overall sales share & Pareto 80/20 flags per zone
  const totalZonesSales = filteredData.zones.reduce((sum, z) => sum + (z.ventasNetas || 0), 0);
  
  const coreMap = React.useMemo(() => {
    const salesRanked = [...filteredData.zones].sort((a, b) => b.ventasNetas - a.ventasNetas);
    let accumSum = 0;
    const map = {};
    salesRanked.forEach(z => {
      accumSum += z.ventasNetas;
      const accumShare = totalZonesSales > 0 ? accumSum / totalZonesSales : 0;
      map[z.zona] = {
        share: totalZonesSales > 0 ? z.ventasNetas / totalZonesSales : 0,
        accumShare,
        isCore: accumShare <= 0.82
      };
    });
    return map;
  }, [filteredData.zones, totalZonesSales]);

  // Map of Cambios (vencimientos) by zone / executive (excluding rechazos)
  // Fuente 1: expiryClientReturns (detalle por cliente) — se llena cuando el cubo tiene columna de motivo
  // Fuente 2: returnsSellers.cambios — siempre disponible desde returns_sellers en Supabase
  const zoneCambiosMap = React.useMemo(() => {
    const map = {};
    // Fuente 1: detalle por cliente (más preciso)
    (filteredData.expiryClientReturns || []).forEach(c => {
      const key = c.ejecutivo || '';
      if (key) map[key] = (map[key] || 0) + (Number(c.valor) || 0);
    });
    // Fuente 2: si no hay detalle por cliente, usar campo cambios de returnsSellers
    if (Object.keys(map).length === 0) {
      (filteredData.returnsSellers || []).forEach(s => {
        const key = s.ejecutivo || '';
        const camb = Number(s.cambios) || 0;
        if (key && camb > 0) map[key] = (map[key] || 0) + camb;
      });
    }
    return map;
  }, [filteredData.expiryClientReturns, filteredData.returnsSellers]);

  // Map of Ventas Brutas by zone / executive (para calcular la tasa sobre ventas brutas, uniforme con Devoluciones)
  const zoneGrossSalesMap = React.useMemo(() => {
    const map = {};
    (filteredData.returnsSellers || []).forEach(s => {
      const key = s.ejecutivo || s.nombre || '';
      const gross = Number(s.ventasBrutas) || Number(s.ventas) || 0;
      if (key && gross > 0) map[key] = (map[key] || 0) + gross;
    });
    return map;
  }, [filteredData.returnsSellers]);

  const getZoneGrossSales = React.useCallback((z) => {
    const fromMap = (zoneGrossSalesMap[z.zona] || 0) || (zoneGrossSalesMap[z.vendedor] || 0);
    if (fromMap > 0) return fromMap;
    return (Number(z.ventasNetas) || 0) + (Number(z.devoluciones) || 0) || (Number(z.ventasNetas) || 0);
  }, [zoneGrossSalesMap]);

  const getZoneCambioVal = React.useCallback((z) => {
    const valorCambio = (zoneCambiosMap[z.zona] || 0) || (zoneCambiosMap[z.vendedor] || 0);
    if (valorCambio > 0) return valorCambio;
    const rate = Number(z.cambiosPorc) || ZONE_DEFAULT_CAMBIO_RATES[z.zona] || 0.015;
    const grossSales = getZoneGrossSales(z);
    return grossSales * rate;
  }, [zoneCambiosMap, getZoneGrossSales]);

  const getZoneCambioRate = React.useCallback((z) => {
    const valorCambio = (zoneCambiosMap[z.zona] || 0) || (zoneCambiosMap[z.vendedor] || 0);
    const grossSales = getZoneGrossSales(z);
    if (valorCambio > 0 && grossSales > 0) {
      return valorCambio / grossSales;
    }
    return Number(z.cambiosPorc) || ZONE_DEFAULT_CAMBIO_RATES[z.zona] || 0.015;
  }, [zoneCambiosMap, getZoneGrossSales]);

  // Proyección % = Proyección (pesos) / Presupuesto
  const getProyPercent = React.useCallback((proyeccion, presupuesto) => {
    if (!presupuesto) return 0;
    return proyeccion / presupuesto;
  }, []);

  // Días hábiles totales del período — fuente única en calculations.js
  const TOTAL_BD = getDiasHabiles(selectedPeriod);
  const detectedWorkDay = React.useMemo(() => countCalendarBusinessDays(filteredData.salesDaily), [filteredData.salesDaily]);
  const workDay = currentWorkDay > 0 ? currentWorkDay : detectedWorkDay;

  // Proyección (Pesos) = (Ventas Netas / díaHábilActual) * díasHábilesTotales
  const getProjection = React.useCallback((ventasNetas) => {
    if (!ventasNetas || workDay <= 0) return 0;
    return (ventasNetas / workDay) * TOTAL_BD;
  }, [workDay, TOTAL_BD]);

  const CANAL_ORDER = {
    'TAT': 1,
    'SUPERMERCADOS': 2,
    'ZONAS ESPECIALES': 3,
    'OTRO': 4
  };

  // 2. Sort zones: Group by Canal first, then numeric order by zona (9450, 9451, 9452...)
  const sortedZones = React.useMemo(() => {
    return [...filteredData.zones].sort((a, b) => {
      let comp = 0;
      if (sortField === 'zona' || sortField === 'canal') {
        const canalA = ZONE_TYPE_MAP[a.zona] || 'TAT';
        const canalB = ZONE_TYPE_MAP[b.zona] || 'TAT';
        const orderA = CANAL_ORDER[canalA] || 99;
        const orderB = CANAL_ORDER[canalB] || 99;
        if (orderA !== orderB) {
          comp = orderA - orderB;
        } else {
          comp = String(a.zona || '').localeCompare(String(b.zona || ''), undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'vendedor') {
        comp = String(a.vendedor || '').localeCompare(String(b.vendedor || ''));
      } else if (sortField === 'ventas') {
        comp = (a.ventasNetas || 0) - (b.ventasNetas || 0);
      } else if (sortField === 'presupuesto') {
        comp = (a.presupuesto || 0) - (b.presupuesto || 0);
      } else if (sortField === 'cambio') {
        const cA = getZoneCambioRate(a);
        const cB = getZoneCambioRate(b);
        comp = cA - cB;
      } else if (sortField === 'proyeccion') {
        const pA = getProjection(a.ventasNetas);
        const pB = getProjection(b.ventasNetas);
        comp = pA - pB;
      } else if (sortField === 'accumShare') {
        comp = (coreMap[a.zona]?.accumShare || 0) - (coreMap[b.zona]?.accumShare || 0);
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredData.zones, sortField, sortOrder, coreMap, getZoneCambioRate]);

  const paretoData = sortedZones.map((z) => {
    const meta = coreMap[z.zona] || { share: 0, accumShare: 0, isCore: false };
    return {
      ...z,
      share: meta.share,
      accumShare: meta.accumShare,
      isCore: meta.isCore,
      proyeccion: getProjection(z.ventasNetas)
    };
  });

  const paretoTotals = React.useMemo(() => {
    const totalVentas = paretoData.reduce((sum, item) => sum + (item.ventasNetas || 0), 0);
    const totalPresupuesto = paretoData.reduce((sum, item) => sum + (item.presupuesto || 0), 0);
    const totalProyeccion = paretoData.reduce((sum, item) => sum + (item.proyeccion || 0), 0);
    const totalCambiosVal = paretoData.reduce((sum, item) => sum + getZoneCambioVal(item), 0);
    const totalVentasBrutas = paretoData.reduce((sum, item) => sum + getZoneGrossSales(item), 0);
    const changeRate = totalVentasBrutas > 0
      ? totalCambiosVal / totalVentasBrutas
      : (totalVentas > 0 ? totalCambiosVal / totalVentas : 0.015);
    return {
      totalVentas,
      totalPresupuesto,
      totalProyeccion,
      changeRate,
    };
  }, [paretoData, getZoneCambioVal, getZoneGrossSales]);

  const groupedByCanal = React.useMemo(() => {
    const map = {};
    const list = [];

    paretoData.forEach((item) => {
      const canal = ZONE_TYPE_MAP[item.zona] || 'TAT';
      if (!map[canal]) {
        map[canal] = { canal, items: [] };
        list.push(map[canal]);
      }
      map[canal].items.push(item);
    });

    return list.map((g) => {
       const totalVentas = g.items.reduce((sum, i) => sum + (i.ventasNetas || 0), 0);
       const totalPresupuesto = g.items.reduce((sum, i) => sum + (i.presupuesto || 0), 0);
       const totalProyeccion = g.items.reduce((sum, i) => sum + (i.proyeccion || 0), 0);
       const totalCambiosVal = g.items.reduce((sum, i) => sum + getZoneCambioVal(i), 0);
       const totalVentasBrutas = g.items.reduce((sum, i) => sum + getZoneGrossSales(i), 0);
       const changeRate = totalVentasBrutas > 0
         ? totalCambiosVal / totalVentasBrutas
         : (totalVentas > 0 ? totalCambiosVal / totalVentas : 0.015);
       const lastItem = g.items[g.items.length - 1];
       const maxAccumShare = lastItem ? lastItem.accumShare : 0;

      return {
        ...g,
        subtotal: {
          ventasNetas: totalVentas,
          presupuesto: totalPresupuesto,
          proyeccion: totalProyeccion,
          changeRate,
          accumShare: maxAccumShare
        }
      };
    });
  }, [paretoData, getZoneCambioVal, getZoneGrossSales]);

  // Simple Linear Forecast for next 7 days based on daily trend
  const dailyTotal = filteredData.salesDaily.filter(d => d.fecha !== 'general');
  const n = dailyTotal.length;
  
  // Predict next days if we have data
  let forecastData = [];
  if (n > 2) {
    const xSum = dailyTotal.reduce((sum, _, idx) => sum + idx, 0);
    const ySum = dailyTotal.reduce((sum, d) => sum + d.total, 0);
    const xySum = dailyTotal.reduce((sum, d, idx) => sum + (idx * d.total), 0);
    const xSqSum = dailyTotal.reduce((sum, _, idx) => sum + (idx * idx), 0);
    
    // Line parameters: y = mx + c
    const m = (n * xySum - xSum * ySum) / (n * xSqSum - xSum * xSum);
    const c = (ySum - m * xSum) / n;
    
    // Map past data and append forecast
    forecastData = dailyTotal.map((d, idx) => ({
      fecha: d.fecha,
      total: d.total,
      type: 'historial'
    }));

    // Add 5 forecasted days starting from the last date
    const lastDateStr = dailyTotal[n - 1].fecha;
    const lastDate = new Date(lastDateStr);
    for (let i = 1; i <= 5; i++) {
      const nextIdx = n + i;
      const forecastVal = Math.max(0, m * nextIdx + c);
      
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + i);
      const day = String(nextDate.getDate());
      const month = String(nextDate.getMonth() + 1);
      const year = String(nextDate.getFullYear());
      
      forecastData.push({
        fecha: `${month}/${day}/${year} (P)`,
        total: forecastVal,
        type: 'pronostico'
      });
    }
  } else {
    forecastData = dailyTotal;
  }

  // Totales por eje comercial
  const ejeTotals = React.useMemo(() => {
    const map = { PEREIRA: 0, MANIZALES: 0, ARMENIA: 0 };
    filteredData.zones.forEach(z => {
      const city = ZONA_CIUDAD_MAP[z.zona] || 'OTRO';
      if (map[city] !== undefined) map[city] += z.ventasNetas;
    });
    return map;
  }, [filteredData.zones]);

  const totalEjes = Object.values(ejeTotals).reduce((s, v) => s + v, 0) || 1;
  const totalNetSales = filteredData.zones.reduce((sum, z) => sum + (z.ventasNetas || 0), 0);
  const grossCredit = dailyTotal.reduce((sum, d) => sum + (Number(d.credito) || 0), 0);
  const grossCash = dailyTotal.reduce((sum, d) => sum + (Number(d.contado) || 0), 0);
  const grossTotal = grossCash + grossCredit || 1;
  const creditPercentage = grossCredit / grossTotal;

  // Ventas de Contado y Crédito NETAS (Ajustadas a la Venta Neta real de las zonas)
  // De este modo, Contado Neta + Crédito Neta es exactamente igual a Venta Neta ($1.486 Mill)
  const cashTotal = totalNetSales > 0 ? Math.round(totalNetSales * (1 - creditPercentage)) : grossCash;
  const creditTotal = totalNetSales > 0 ? Math.round(totalNetSales * creditPercentage) : grossCredit;


  // Dynamic forecast labels based on first/last dates
  const getForecastLabels = () => {
    if (dailyTotal.length === 0) return { history: 'Historial (Abril)', forecast: 'Pronóstico (Mayo)' };
    
    const firstDate = new Date(dailyTotal[0].fecha);
    const lastDate = new Date(dailyTotal[dailyTotal.length - 1].fecha);
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const historyMonth = !isNaN(firstDate.getTime()) ? monthNames[firstDate.getMonth()] : 'Abril';
    
    const forecastDate = new Date(lastDate);
    if (!isNaN(forecastDate.getTime())) {
      forecastDate.setDate(forecastDate.getDate() + 1);
    }
    const forecastMonth = !isNaN(forecastDate.getTime()) ? monthNames[forecastDate.getMonth()] : 'Mayo';
    
    return {
      history: `Historial (${historyMonth})`,
      forecast: `Pronóstico Lineal (${forecastMonth})`
    };
  };
  
  const forecastLabels = getForecastLabels();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900">Análisis de Ventas</h1>
        <p className="text-slate-600 text-xs mt-0.5 font-medium">
          Comportamiento de facturación comercial, métodos de pago, forecast y rankings de zona.
        </p>
      </div>

      {/* ── Resumen por eje comercial ── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { city: 'PEREIRA',   label: 'Eje Pereira',  bg: 'bg-blue-50/80',    text: 'text-blue-700',    border: 'border-blue-200'    },
          { city: 'MANIZALES', label: 'Eje Caldas',   bg: 'bg-indigo-50/80',  text: 'text-indigo-700',  border: 'border-indigo-200'  },
          { city: 'ARMENIA',   label: 'Eje Quindío',  bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-200' },
        ].map(({ city, label, bg, text, border }) => {
          const v = ejeTotals[city] || 0;
          const share = v / totalEjes;
          return (
            <GlassCard key={city} hoverable={false} className={`border ${border} relative overflow-hidden !p-3 shadow-xs`}>
              <div className={`absolute inset-0 ${bg} pointer-events-none rounded-2xl`} />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] font-extrabold uppercase tracking-widest ${text}`}>{label}</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{formatShortCurrency(v)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${text.replace('text-', 'bg-')}`} style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className={`text-[9px] font-bold ${text}`}>{formatPercent(share)}</span>
                  </div>
                </div>
                <MapPin className={`h-5 w-5 opacity-20 ${text} shrink-0`} />
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Métricas de facturación — fila compacta */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Contado neto',   value: formatShortCurrency(cashTotal),              sub: formatPercent(1 - creditPercentage), color: 'text-emerald-700', border: 'border-emerald-200' },
          { label: 'Crédito neto',   value: formatShortCurrency(creditTotal),            sub: formatPercent(creditPercentage),     color: 'text-amber-700',   border: 'border-amber-200'   },
          { label: 'Venta bruta',    value: formatShortCurrency(grossCash + grossCredit), sub: 'antes de devoluciones',            color: 'text-blue-700',    border: 'border-blue-200'    },
          { label: 'Ticket Super',   value: formatCurrency(channelTicket.SUPERMERCADOS),  sub: 'por factura',                      color: 'text-indigo-700',  border: 'border-indigo-200'  },
          { label: 'Ticket TAT',     value: formatCurrency(channelTicket.TAT),            sub: 'por factura',                      color: 'text-violet-700',  border: 'border-violet-200'  },
        ].map(({ label, value, sub, color, border }) => (
          <GlassCard key={label} hoverable={false} className={`bg-white border ${border} !p-2.5 shadow-xs`}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold truncate">{label}</p>
            <p className={`text-lg font-black mt-0.5 ${color}`}>{value}</p>
            <p className="text-[9px] text-slate-600 font-medium mt-0.5 truncate">{sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GlassCard hoverable={false} className="!p-3 md:!p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Avance vs Meta · {workDay} de {TOTAL_BD} días hábiles</h3>
          <BIAreaChart
            data={filteredData.salesDaily.filter(d => d.fecha !== 'general')}
            presupuesto={paretoTotals.totalPresupuesto}
            diasHabiles={TOTAL_BD}
            workDay={workDay}
            ventaNeta={totalNetSales}
          />
        </GlassCard>

        <GlassCard hoverable={false} className="!p-3 md:!p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Tendencia y Pronóstico Comercial (Próximos 5 Días)</h3>
          <BILineChart
            data={forecastData}
            metaDiaria={paretoTotals.totalPresupuesto > 0 ? Math.round(paretoTotals.totalPresupuesto / TOTAL_BD) : 0}
          />
        </GlassCard>
      </div>

      {/* Pareto 80/20 */}
      <GlassCard hoverable={false} className="!p-3 md:!p-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Análisis de Pareto 80/20 por Zonas</h3>
            <p className="text-[10px] text-slate-600 font-medium mt-0.5">
              Clasificación de zonas según su contribución al volumen total de ventas netas.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1 text-[10px] text-amber-800 font-bold uppercase tracking-wider shrink-0 w-fit shadow-xs">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Zonas Core (80% Facturación)</span>
          </div>
        </div>

        {/* Tabla Pareto */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold select-none bg-slate-50">
                <th className="pb-3 pt-2 pl-2 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('zona')}>
                  Zona {sortField === 'zona' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 hidden sm:table-cell cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('canal')}>
                  Canal {sortField === 'canal' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2">Eje</th>
                <th className="pb-3 pt-2 hidden md:table-cell cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('vendedor')}>
                  Vendedor {sortField === 'vendedor' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right hidden sm:table-cell cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('presupuesto')}>
                  Presupuesto {sortField === 'presupuesto' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('ventas')}>
                  Ventas Acum {sortField === 'ventas' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right hidden sm:table-cell cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('proyeccion')}>
                  Proyección (Pesos) {sortField === 'proyeccion' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right hidden md:table-cell cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('accumShare')}>
                  Proy. % {sortField === 'accumShare' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('cambio')}>
                  Cambio % {sortField === 'cambio' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groupedByCanal.map((group, gIdx) => (
                <React.Fragment key={gIdx}>
                  {group.items.map((item, idx) => {
                    const cambioRate = getZoneCambioRate(item);
                    return (
                      <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${item.isCore ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-2.5 pl-2 font-bold text-slate-900">{item.zona}</td>
                        <td className="py-2.5 hidden sm:table-cell font-semibold text-slate-700">{ZONE_TYPE_MAP[item.zona] || 'TAT'}</td>
                        <td className="py-2.5"><CityBadge zona={item.zona} /></td>
                        <td className="py-2.5 text-slate-600 text-[11px] max-w-[120px] truncate hidden md:table-cell font-medium">{item.vendedor}</td>
                        <td className="py-2.5 text-right text-slate-600 hidden sm:table-cell font-semibold">{formatCurrency(item.presupuesto)}</td>
                        <td className="py-2.5 text-right text-slate-900 font-bold">{formatCurrency(item.ventasNetas)}</td>
                        <td className="py-2.5 text-right hidden sm:table-cell text-blue-700 font-extrabold">
                          {formatCurrency(item.proyeccion)}
                        </td>
                        <td className="py-2.5 text-right hidden md:table-cell">
                          {(() => {
                            const ratio = item.proyeccion / (item.presupuesto || 1);
                            const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                            return <span className={`font-extrabold ${isGreen ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPercent(ratio)}</span>;
                          })()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`font-extrabold ${cambioRate > 0.015 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {formatPercent(cambioRate)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Fila Subtotal por Canal */}
                  <tr className="bg-amber-50/70 border-t border-b border-amber-200 font-semibold">
                    <td className="py-2.5 pl-2 text-amber-900 font-black uppercase text-[11px] tracking-wider" colSpan={2}>
                      SUBTOTAL {group.canal}
                    </td>
                    <td className="py-2.5 text-slate-600">—</td>
                    <td className="py-2.5 hidden md:table-cell text-slate-600">—</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-800 hidden sm:table-cell text-xs">{formatCurrency(group.subtotal.presupuesto)}</td>
                    <td className="py-2.5 text-right font-black text-amber-900 text-xs">{formatCurrency(group.subtotal.ventasNetas)}</td>
                    <td className="py-2.5 text-right font-black text-blue-800 hidden sm:table-cell text-xs">{formatCurrency(group.subtotal.proyeccion)}</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-800 hidden md:table-cell text-xs">
                      {(() => {
                        const ratio = group.subtotal.proyeccion / (group.subtotal.presupuesto || 1);
                        const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                        return <span className={`font-black ${isGreen ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPercent(ratio)}</span>;
                      })()}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`font-black text-xs ${group.subtotal.changeRate > 0.015 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {formatPercent(group.subtotal.changeRate)}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-black text-slate-900">
                <td className="py-3 pl-2 text-blue-800 font-black uppercase tracking-wider">TOTALES</td>
                <td className="py-3 hidden sm:table-cell text-slate-600">—</td>
                <td className="py-3 text-slate-600">—</td>
                <td className="py-3 hidden md:table-cell text-slate-600">—</td>
                <td className="py-3 text-right font-black text-slate-900 hidden sm:table-cell text-xs md:text-sm">{formatCurrency(paretoTotals.totalPresupuesto)}</td>
                <td className="py-3 text-right font-black text-slate-900 text-xs md:text-sm">{formatCurrency(paretoTotals.totalVentas)}</td>
                <td className="py-3 text-right font-black text-blue-800 hidden sm:table-cell text-xs md:text-sm">{formatCurrency(paretoTotals.totalProyeccion)}</td>
                <td className="py-3 text-right font-black text-slate-900 hidden md:table-cell text-xs md:text-sm">
                  {(() => {
                    const ratio = paretoTotals.totalProyeccion / (paretoTotals.totalPresupuesto || 1);
                    const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                    return <span className={`font-black ${isGreen ? 'text-emerald-700' : 'text-rose-700'}`}>{formatPercent(ratio)}</span>;
                  })()}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-black text-xs md:text-sm ${paretoTotals.changeRate > 0.015 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatPercent(paretoTotals.changeRate)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default SalesAnalysis;
