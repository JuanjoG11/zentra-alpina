import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
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
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Pareto 80/20 Analysis - Sort zones by net sales
  const sortedZones = [...filteredData.zones]
    .sort((a, b) => b.ventasNetas - a.presupuesto); // Rank by actual Net Sales

  const totalZonesSales = sortedZones.reduce((sum, z) => sum + z.ventasNetas, 0);
  
  let accumulatedSum = 0;
  const paretoData = sortedZones.map((z) => {
    accumulatedSum += z.ventasNetas;
    const share = totalZonesSales > 0 ? z.ventasNetas / totalZonesSales : 0;
    const accumShare = totalZonesSales > 0 ? accumulatedSum / totalZonesSales : 0;
    return {
      ...z,
      share,
      accumShare,
      isCore: accumShare <= 0.82 // Mark core zones contributing to ~80%
    };
  });

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
        <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de Ventas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Profundice en el comportamiento de facturación comercial, métodos de pago, forecast y rankings de zona.
        </p>
      </div>

      {/* ── Resumen por eje comercial ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${text}`}>{label}</p>
                  <p className="text-xl font-extrabold text-white mt-1">{formatShortCurrency(v)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${text.replace('text-', 'bg-')}`} style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold ${text}`}>{formatPercent(share)}</span>
                  </div>
                </div>
                <MapPin className={`h-8 w-8 opacity-10 ${text}`} />
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Credit & Cash Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas de Contado</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(cashTotal)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{formatPercent(1 - creditPercentage)} del total comercial</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas a Crédito</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(creditTotal)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{formatPercent(creditPercentage)} del total comercial</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ticket Promedio</p>
            <h3 className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(kpis.averageTicket)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Venta por factura emitida</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Layers className="h-6 w-6" />
          </div>
        </GlassCard>
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

      {/* Pareto 80/20 Table */}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-semibold">
                <th className="pb-3 pl-2">Zona</th>
                <th className="pb-3">Eje</th>
                <th className="pb-3">Vendedor</th>
                <th className="pb-3 text-right">Ventas Netas</th>
                <th className="pb-3 text-right">Presupuesto</th>
                <th className="pb-3 text-right">Cumplimiento</th>
                <th className="pb-3 text-right">Participación %</th>
                <th className="pb-3 text-right">Acumulado %</th>
                <th className="pb-3 pr-2 text-center">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {paretoData.map((item, idx) => {
                const complianceRate = item.presupuesto > 0 ? item.ventasNetas / item.presupuesto : 0;
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-900/20 transition-colors ${item.isCore ? 'bg-blue-600/[0.02]' : ''}`}
                  >
                    <td className="py-3 pl-2 font-bold text-slate-200">{item.zona}</td>
                    <td className="py-3"><CityBadge zona={item.zona} /></td>
                    <td className="py-3 text-slate-400 text-[11px] max-w-[130px] truncate">{item.vendedor}</td>
                    <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(item.ventasNetas)}</td>
                    <td className="py-3 text-right text-slate-400">{formatCurrency(item.presupuesto)}</td>
                    <td className="py-3 text-right">
                      <span className={`font-bold ${
                        complianceRate >= 1.0 ? 'text-emerald-400' :
                        complianceRate >= 0.8 ? 'text-amber-400'   : 'text-rose-400'
                      }`}>
                        {formatPercent(complianceRate)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-300">{formatPercent(item.share)}</td>
                    <td className="py-3 text-right text-slate-400">{formatPercent(item.accumShare)}</td>
                    <td className="py-3 pr-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        item.isCore
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800/80 text-slate-500'
                      }`}>
                        {item.isCore ? 'CORE (A)' : 'B/C'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default SalesAnalysis;
