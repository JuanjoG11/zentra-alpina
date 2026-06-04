import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import { 
  Users, 
  Trophy, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

const SellersAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Pereira Zone commercial rankings
  const rankedZones = [...filteredData.zones]
    .sort((a, b) => b.ventasNetas - a.ventasNetas);

  // M9450/Sellers quality / returns rankings
  const rankedSellers = [...filteredData.returnsSellers]
    .sort((a, b) => b.ventas - a.ventas);

  // Alerts: Vendedores con devoluciones críticas (> 5%)
  const criticalSellersAlerts = filteredData.returnsSellers
    .filter(s => s.porcentajeDevolucion > 0.05)
    .sort((a, b) => b.porcentajeDevolucion - a.porcentajeDevolucion);

  // Top Zone & Top Seller names
  const topZoneObj = rankedZones[0];
  const topSellerObj = rankedSellers[0];

  // Fallback: if rankedZones is empty due to filters, use global db data
  const fallbackZones = [...(dbData.zones || [])].sort((a, b) => b.ventasNetas - a.ventasNetas);
  const zonesForChart = (rankedZones.length > 0 ? rankedZones : fallbackZones).slice(0, 10);

  // Apex options for seller performance comparison
  const barSeries = [
    {
      name: 'Ventas Netas',
      data: zonesForChart.map(z => z.ventasNetas)
    },
    {
      name: 'Presupuesto',
      data: zonesForChart.map(z => z.presupuesto)
    }
  ];

  const barOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      foreColor: '#94a3b8',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#3b82f6', '#334155'], // blue-500, slate-700
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded',
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: zonesForChart.map(z => `Z-${z.zona}`),
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: {
      labels: { formatter: (val) => formatShortCurrency(val) }
    },
    grid: { borderColor: '#1e293b' },
    fill: { opacity: 1 },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => formatCurrency(val) }
    },
    legend: { position: 'top' }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Rendimiento de Vendedores</h1>
        <p className="text-slate-400 text-sm mt-1">
          Analice las metas de cumplimiento de las zonas comerciales y la tasa de calidad logística de los vendedores.
        </p>
      </div>

      {/* Performers Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard hoverable={false} className="flex items-center gap-4 bg-slate-900/20 border-slate-800">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Top Zona (Pereira)</p>
            <h4 className="text-lg font-bold text-white mt-0.5">
              {topZoneObj ? `Zona ${topZoneObj.zona}` : 'N/A'}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {topZoneObj ? formatCurrency(topZoneObj.ventasNetas) : '$ 0'} netos
            </p>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4 bg-slate-900/20 border-slate-800">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Top Vendedor (Manizales)</p>
            <h4 className="text-lg font-bold text-white mt-0.5">
              {topSellerObj ? topSellerObj.nombre : 'N/A'}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Tasa Dev: {topSellerObj ? formatPercent(topSellerObj.porcentajeDevolucion) : '0%'}
            </p>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4 bg-rose-500/[0.03] border-rose-950/40">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <ShieldAlert className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="text-rose-500/80 text-[10px] font-semibold uppercase tracking-wider">Alertas Críticas (&gt;5% Dev)</p>
            <h4 className="text-lg font-bold text-slate-100 mt-0.5">
              {criticalSellersAlerts.length} Ejecutivos
            </h4>
            <p className="text-[10px] text-rose-400 mt-0.5">Requieren atención inmediata</p>
          </div>
        </GlassCard>
      </div>

      {/* Visual Bar Comparison */}
      <GlassCard hoverable={false}>
        <h3 className="text-base font-bold text-white mb-4">Meta vs Ventas Netas por Zona Comercial (Top 10)</h3>
        <Chart options={barOptions} series={barSeries} type="bar" height={300} />
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Sellers Panel */}
        <GlassCard hoverable={false} className="col-span-1 border-rose-950/30 bg-rose-950/[0.01]">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
            <h3 className="text-sm font-bold text-white">Alertas de Devoluciones</h3>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
            {criticalSellersAlerts.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/40 border border-rose-500/10 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.nombre}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ejecutivo: {item.ejecutivo}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-400">{formatPercent(item.porcentajeDevolucion)}</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Dev: {formatCurrency(item.devoluciones)}</p>
                </div>
              </div>
            ))}
            {criticalSellersAlerts.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">No hay alertas activas de devolución.</p>
            )}
          </div>
        </GlassCard>

        {/* Dynamic Zone Table */}
        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Desempeño General de Zonas</h3>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-2 py-0.5 rounded-full">
              Pereira
            </span>
          </div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto pr-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-semibold sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
                  <th className="pb-3 pl-2">Zona</th>
                  <th className="pb-3 text-right">Ventas Netas</th>
                  <th className="pb-3 text-right">Presupuesto</th>
                  <th className="pb-3 text-right">Cumplimiento</th>
                  <th className="pb-3 text-right pr-2">Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {rankedZones.map((item, idx) => {
                  const complianceRate = item.ventasNetas / item.presupuesto;
                  return (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-2.5 pl-2 font-bold text-slate-200">Zona {item.zona}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-100">{formatCurrency(item.ventasNetas)}</td>
                      <td className="py-2.5 text-right text-slate-400">{formatCurrency(item.presupuesto)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${
                          complianceRate >= 1.0 ? 'text-emerald-400' : complianceRate >= 0.8 ? 'text-blue-400' : 'text-slate-400'
                        }`}>
                          {formatPercent(complianceRate)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-2 text-slate-300 font-mono">{item.facturas.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* Sellers List Detail (Manizales) */}
      <GlassCard hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Desempeño de Vendedores (Logística y Calidad)</h3>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
            Manizales
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-semibold">
                <th className="pb-3 pl-2">Ejecutivo</th>
                <th className="pb-3">Nombre Completo</th>
                <th className="pb-3 text-right">Venta Bruta</th>
                <th className="pb-3 text-right">Devoluciones</th>
                <th className="pb-3 text-right">Tasa Devolución</th>
                <th className="pb-3 text-right pr-2">Calidad de Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {rankedSellers.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-2.5 pl-2 font-mono text-slate-400">{item.ejecutivo}</td>
                  <td className="py-2.5 font-bold text-slate-200">{item.nombre}</td>
                  <td className="py-2.5 text-right text-slate-300 font-semibold">{formatCurrency(item.ventas)}</td>
                  <td className="py-2.5 text-right font-semibold text-rose-400">{formatCurrency(item.devoluciones)}</td>
                  <td className="py-2.5 text-right text-slate-400">{formatPercent(item.porcentajeDevolucion)}</td>
                  <td className="py-2.5 text-right pr-2">
                    <span className={`inline-flex items-center gap-1 font-bold ${
                      item.porcentajeDevolucion <= 0.02 ? 'text-emerald-400' : item.porcentajeDevolucion <= 0.05 ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                      {formatPercent(1 - item.porcentajeDevolucion)}
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

export default SellersAnalysis;
