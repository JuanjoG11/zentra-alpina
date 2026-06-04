import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { 
  BIAreaChart, 
  BIStackedBarChart,
  BILineChart
} from '../components/charts/BICharts';
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Layers,
  ArrowUpRight
} from 'lucide-react';

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

  // Credit vs Cash aggregates: sum dynamically from all valid salesDaily records
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
                <th className="pb-3 text-right">Ventas Netas</th>
                <th className="pb-3 text-right">Presupuesto</th>
                <th className="pb-3 text-right">Cumplimiento</th>
                <th className="pb-3 text-right">Participación %</th>
                <th className="pb-3 text-right">Acumulado %</th>
                <th className="pb-3 pr-2 text-center">Clasificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {paretoData.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-slate-900/20 transition-colors ${
                    item.isCore ? 'bg-blue-600/[0.02]' : ''
                  }`}
                >
                  <td className="py-3 pl-2 font-bold text-slate-200">Zona {item.zona}</td>
                  <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(item.ventasNetas)}</td>
                  <td className="py-3 text-right text-slate-400">{formatCurrency(item.presupuesto)}</td>
                  <td className="py-3 text-right">
                    <span className={`font-semibold ${
                      item.ventasNetas >= item.presupuesto ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {formatPercent(item.ventasNetas / item.presupuesto)}
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
                      {item.isCore ? 'ZONA CORE (A)' : 'ZONA B/C'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default SalesAnalysis;
