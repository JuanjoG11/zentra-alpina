import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP, ZONE_TYPE_MAP, ZONE_DEFAULT_CAMBIO_RATES, countCalendarBusinessDays } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency, formatCurrencyWithDecimals } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIAreaChart, BIStackedBarChart, BILineChart } from '../components/charts/BICharts';
import { TrendingUp, CreditCard, DollarSign, Layers, ArrowUpRight, MapPin } from 'lucide-react';

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',  bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  MANIZALES: { label: 'Eje Caldas',   bg: 'bg-indigo-500/10',  text: 'text-indigo-400'  },
  ARMENIA:   { label: 'Eje Quindío',  bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  OTRO:      { label: 'Otro',         bg: 'bg-slate-500/10',   text: 'text-slate-400'   },
};

const CityBadge = ({ zona }) => {
  const city = ZONA_CIUDAD_MAP[zona] || 'OTRO';
  const m = CITY_META[city] || CITY_META.OTRO;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${m.bg} ${m.text}`}>
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
    'ZONAS ESPECIALES': { sales: 0, facturas: 0 }
  };
  filteredData.zones.forEach(z => {
    const type = ZONE_TYPE_MAP[z.zona] || 'OTRO';
    if (sums[type]) {
      sums[type].sales += z.ventasNetas || 0;
      sums[type].facturas += z.facturas || 0;
    }
  });
  return {
    SUPERMERCADOS: sums.SUPERMERCADOS.facturas ? sums.SUPERMERCADOS.sales / sums.SUPERMERCADOS.facturas : 0,
    'ZONAS ESPECIALES': sums['ZONAS ESPECIALES'].facturas ? sums['ZONAS ESPECIALES'].sales / sums['ZONAS ESPECIALES'].facturas : 0
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
  const zoneCambiosMap = React.useMemo(() => {
    const map = {};
    (filteredData.expiryClientReturns || []).forEach(c => {
      const key = c.ejecutivo || '';
      if (key) map[key] = (map[key] || 0) + (Number(c.valor) || 0);
    });
    return map;
  }, [filteredData.expiryClientReturns]);

  const getZoneCambioVal = React.useCallback((z) => {
    const valorCambio = (zoneCambiosMap[z.zona] || 0) || (zoneCambiosMap[z.vendedor] || 0);
    if (valorCambio > 0) return valorCambio;
    const rate = Number(z.cambiosPorc) || ZONE_DEFAULT_CAMBIO_RATES[z.zona] || 0.015;
    return (z.ventasNetas || 0) * rate;
  }, [zoneCambiosMap]);

  const getZoneCambioRate = React.useCallback((z) => {
    const valorCambio = (zoneCambiosMap[z.zona] || 0) || (zoneCambiosMap[z.vendedor] || 0);
    if (valorCambio > 0 && z.ventasNetas > 0) {
      return valorCambio / z.ventasNetas;
    }
    return Number(z.cambiosPorc) || ZONE_DEFAULT_CAMBIO_RATES[z.zona] || 0.015;
  }, [zoneCambiosMap]);

  // Proyección % = Proyección (pesos) / Presupuesto
  const getProyPercent = React.useCallback((proyeccion, presupuesto) => {
    if (!presupuesto) return 0;
    return proyeccion / presupuesto;
  }, []);

  // Días hábiles totales del período y día hábil actual (sincronizado desde Supabase)
  const DIAS_HABILES_POR_PERIODO = { '2026-06': 22, '2026-07': 23 };
  const TOTAL_BD = DIAS_HABILES_POR_PERIODO[selectedPeriod] || 22;
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
    const changeRate = totalVentas > 0 ? totalCambiosVal / totalVentas : 0.015;
    return {
      totalVentas,
      totalPresupuesto,
      totalProyeccion,
      changeRate,
    };
  }, [paretoData, getZoneCambioVal]);

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
       const changeRate = totalVentas > 0 ? totalCambiosVal / totalVentas : 0.015;
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
  }, [paretoData, getZoneCambioVal]);

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
  const creditTotal = dailyTotal.reduce((sum, d) => sum + (Number(d.credito) || 0), 0) || 587897284;
  const cashTotal = dailyTotal.reduce((sum, d) => sum + (Number(d.contado) || 0), 0) || 4759532351;
  const creditPercentage = creditTotal / (creditTotal + cashTotal || 1);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Análisis de Ventas</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Profundice en el comportamiento de facturación comercial, métodos de pago, forecast y rankings de zona.
        </p>
      </div>

      {/* ── Resumen por eje comercial ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[
          { city: 'PEREIRA',   label: 'Eje Pereira',  bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
          { city: 'MANIZALES', label: 'Eje Caldas',   bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20'  },
          { city: 'ARMENIA',   label: 'Eje Quindío',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        ].map(({ city, label, bg, text, border }) => {
          const v = ejeTotals[city] || 0;
          const share = v / totalEjes;
          return (
            <GlassCard key={city} hoverable={false} className={`border ${border} relative overflow-hidden`}>
              <div className={`absolute inset-0 ${bg} opacity-25 pointer-events-none rounded-2xl`} />
              <div className="relative flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${text}`}>{label}</p>
                  <p className="text-lg md:text-xl font-extrabold text-white mt-1">{formatShortCurrency(v)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-16 md:w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${text.replace('text-', 'bg-')}`} style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${text}`}>{formatPercent(share)}</span>
                  </div>
                </div>
                <MapPin className={`h-6 w-6 md:h-8 md:w-8 opacity-10 ${text} shrink-0 ml-2`} />
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Credit & Cash Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Ventas de Contado</p>
            <h3 className="text-xl md:text-2xl font-bold text-emerald-400 mt-1">{formatShortCurrency(cashTotal)}</h3>
            <p className="text-[9px] md:text-[10px] text-slate-500 mt-1">{formatPercent(1 - creditPercentage)} del total comercial</p>
          </div>
          <div className="p-2.5 md:p-3 bg-emerald-500/10 text-emerald-400 rounded-lg md:rounded-xl shrink-0">
            <DollarSign className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div className="flex-1 min-w-0">
            <p className="text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Ventas a Crédito</p>
            <h3 className="text-xl md:text-2xl font-bold text-amber-400 mt-1">{formatShortCurrency(creditTotal)}</h3>
            <p className="text-[9px] md:text-[10px] text-slate-500 mt-1">{formatPercent(creditPercentage)} del total comercial</p>
          </div>
          <div className="p-2.5 md:p-3 bg-amber-500/10 text-amber-400 rounded-lg md:rounded-xl shrink-0">
            <CreditCard className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </GlassCard>
        
        <div className="md:col-span-2 lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          <GlassCard hoverable={false} className="flex flex-col justify-between bg-slate-900/20 border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Ticket Super</p>
                <h3 className="text-lg md:text-xl font-bold text-blue-400 mt-1">{formatShortCurrency(channelTicket.SUPERMERCADOS)}</h3>
              </div>
              <div className="p-2 md:p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                <Layers className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <p className="text-[9px] md:text-[10px] text-slate-500">Venta por factura (Super)</p>
          </GlassCard>
          
          <GlassCard hoverable={false} className="flex flex-col justify-between bg-slate-900/20 border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider">Ticket Especial</p>
                <h3 className="text-lg md:text-xl font-bold text-blue-400 mt-1">{formatShortCurrency(channelTicket['ZONAS ESPECIALES'])}</h3>
              </div>
              <div className="p-2 md:p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                <Layers className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
            <p className="text-[9px] md:text-[10px] text-slate-500">Venta por factura (Especial)</p>
          </GlassCard>
        </div>
      </div>

      {/* Accumulated Sales and Stacked Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Crecimiento Acumulado de Ventas</h3>
          <BIAreaChart data={filteredData.salesDaily.filter(d => d.fecha !== 'general')} />
        </GlassCard>

        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Tendencia y Pronóstico Comercial (Próximos 5 Días)</h3>
          <BILineChart data={forecastData} />
          <div className="flex justify-center gap-4 text-xs mt-3 text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>{forecastLabels.history}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span>{forecastLabels.forecast}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Pareto 80/20 Section removed */}
      <GlassCard hoverable={false}>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Análisis de Pareto 80/20 por Zonas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clasificación de zonas según su contribución al volumen total de ventas netas.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-[10px] text-amber-400 font-semibold uppercase tracking-wider shrink-0 w-fit">
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            <span>Zonas Core (80% Facturación)</span>
          </div>
        </div>

        {/* Tabla Pareto — scroll horizontal en móvil */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold select-none">
                <th className="pb-3 pl-2 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('zona')}>
                  Zona {sortField === 'zona' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 hidden sm:table-cell cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('canal')}>
                  Canal {sortField === 'canal' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3">Eje</th>
                <th className="pb-3 hidden md:table-cell cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('vendedor')}>
                  Vendedor {sortField === 'vendedor' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 text-right hidden sm:table-cell cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('presupuesto')}>
                  Presupuesto {sortField === 'presupuesto' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('ventas')}>
                  Ventas Acum {sortField === 'ventas' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 text-right hidden sm:table-cell cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('proyeccion')}>
                  Proyección (Pesos) {sortField === 'proyeccion' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 text-right hidden md:table-cell cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('accumShare')}>
                  Proy. % {sortField === 'accumShare' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('cambio')}>
                  Cambio % {sortField === 'cambio' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {groupedByCanal.map((group, gIdx) => (
                <React.Fragment key={gIdx}>
                  {group.items.map((item, idx) => {
                    const cambioRate = getZoneCambioRate(item);
                    return (
                      <tr key={idx} className={`hover:bg-slate-900/20 transition-colors ${item.isCore ? 'bg-blue-600/[0.02]' : ''}`}>
                        <td className="py-2.5 pl-2 font-bold text-slate-200">{item.zona}</td>
                        <td className="py-2.5 hidden sm:table-cell">{ZONE_TYPE_MAP[item.zona] || 'TAT'}</td>
                        <td className="py-2.5"><CityBadge zona={item.zona} /></td>
                        <td className="py-2.5 text-slate-400 text-[11px] max-w-[120px] truncate hidden md:table-cell">{item.vendedor}</td>
                        <td className="py-2.5 text-right text-slate-400 hidden sm:table-cell">{formatCurrency(item.presupuesto)}</td>
                        <td className="py-2.5 text-right text-slate-400">{formatCurrency(item.ventasNetas)}</td>
                        <td className="py-2.5 text-right hidden sm:table-cell text-sky-300 font-semibold">
                          {formatCurrency(item.proyeccion)}
                        </td>
                        <td className="py-2.5 text-right hidden md:table-cell">
                          {(() => {
                            const ratio = item.proyeccion / (item.presupuesto || 1);
                            const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                            return <span className={`font-bold ${isGreen ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPercent(ratio)}</span>;
                          })()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`font-bold ${cambioRate > 0.015 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatPercent(cambioRate)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Fila Subtotal por Canal */}
                  <tr className="bg-slate-900/75 border-t border-b border-amber-500/30 font-semibold">
                    <td className="py-2.5 pl-2 text-amber-400 font-extrabold uppercase text-[11px] tracking-wider" colSpan={2}>
                      SUBTOTAL {group.canal}
                    </td>
                    <td className="py-2.5 text-slate-500">—</td>
                    <td className="py-2.5 hidden md:table-cell text-slate-500">—</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-200 hidden sm:table-cell text-xs">{formatCurrency(group.subtotal.presupuesto)}</td>
                    <td className="py-2.5 text-right font-extrabold text-amber-300 text-xs">{formatCurrency(group.subtotal.ventasNetas)}</td>
                    <td className="py-2.5 text-right font-extrabold text-sky-300 hidden sm:table-cell text-xs">{formatCurrency(group.subtotal.proyeccion)}</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-300 hidden md:table-cell text-xs">
                      {(() => {
                        const ratio = group.subtotal.proyeccion / (group.subtotal.presupuesto || 1);
                        const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                        return <span className={`font-bold ${isGreen ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPercent(ratio)}</span>;
                      })()}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`font-extrabold text-xs ${group.subtotal.changeRate > 0.015 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatPercent(group.subtotal.changeRate)}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-900/90 font-bold">
                <td className="py-3 pl-2 text-sky-400 font-extrabold uppercase tracking-wider">TOTALES</td>
                <td className="py-3 hidden sm:table-cell text-slate-500">—</td>
                <td className="py-3 text-slate-500">—</td>
                <td className="py-3 hidden md:table-cell text-slate-500">—</td>
                <td className="py-3 text-right font-extrabold text-slate-200 hidden sm:table-cell text-xs md:text-sm">{formatCurrency(paretoTotals.totalPresupuesto)}</td>
                <td className="py-3 text-right font-extrabold text-white text-xs md:text-sm">{formatCurrency(paretoTotals.totalVentas)}</td>
                <td className="py-3 text-right font-extrabold text-sky-300 hidden sm:table-cell text-xs md:text-sm">{formatCurrency(paretoTotals.totalProyeccion)}</td>
                <td className="py-3 text-right font-extrabold text-slate-300 hidden md:table-cell text-xs md:text-sm">
                  {(() => {
                    const ratio = paretoTotals.totalProyeccion / (paretoTotals.totalPresupuesto || 1);
                    const isGreen = Math.round(ratio * 1000) / 1000 >= 1;
                    return <span className={`font-bold ${isGreen ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPercent(ratio)}</span>;
                  })()}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-extrabold text-xs md:text-sm ${paretoTotals.changeRate > 0.015 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatPercent(paretoTotals.changeRate)}</span>
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
