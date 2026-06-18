import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency, formatNumber } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BITreemapChart, BIDonutChart } from '../components/charts/BICharts';
import Chart from 'react-apexcharts';
import { 
  Truck, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  CircleDollarSign
} from 'lucide-react';
import alpinaLogo from '../assets/alpina-logo.svg';

const ProvidersAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);

  // If no providers data, show fallback UI
  if (!filteredData || !filteredData.providers || filteredData.providers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        No se encontraron datos de proveedores. Cargue un archivo válido.
      </div>
    );
  }
  // Sorting providers by sales volume 2026
  const sortedProviders = [...filteredData.providers]
    .sort((a, b) => b.ventas2026 - a.ventas2026);

  // Filter only Alpina-related providers / marcas Alpina
  const alpinaProviders = sortedProviders.filter((p) => p.proveedor.toUpperCase().includes('ALPINA'));

  const totalSales2026 = alpinaProviders.reduce((sum, p) => sum + p.ventas2026, 0);
  const totalSales2025 = alpinaProviders.reduce((sum, p) => sum + p.ventas2025, 0);
  const averageMargin = totalSales2026 > 0
    ? (alpinaProviders.reduce((sum, p) => sum + (p.ventas2026 * p.margen2026), 0) / totalSales2026) / 100
    : 0;
  const topProvider = alpinaProviders[0] || null;
  const topProviderShare = topProvider ? topProvider.ventas2026 / totalSales2026 : 0;
  const top3Providers = alpinaProviders.slice(0, 3);
  const top3Contribution = totalSales2026 > 0
    ? top3Providers.reduce((sum, p) => sum + p.ventas2026, 0) / totalSales2026
    : 0;
  const portfolioGrowth = totalSales2025 > 0
    ? (totalSales2026 - totalSales2025) / totalSales2025
    : 0;

  const zoneCity = (zona) => {
    if (zona.startsWith('E')) return 'ARMENIA';
    if (zona.startsWith('M')) return 'MANIZALES';
    if (zona.startsWith('P')) return 'PEREIRA';
    return 'OTRO';
  };

  // Apex comparison chart data (2025 vs 2026 sales)
  const comparisonSeries = [
    {
      name: 'Ventas 2025',
      data: alpinaProviders.map(p => p.ventas2025)
    },
    {
      name: 'Ventas 2026',
      data: alpinaProviders.map(p => p.ventas2026)
    }
  ];

  const comparisonOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      foreColor: '#94a3b8',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#64748b', '#3b82f6'], // slate-500 (2025), blue-500 (2026)
    plotOptions: {
      bar: {
        horizontal: true,
        dataLabels: { position: 'top' },
        barHeight: '75%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      offsetX: -6,
      style: { fontSize: '9px', colors: ['#fff'] },
      formatter: (val) => formatShortCurrency(val)
    },
    stroke: { show: true, width: 1, colors: ['#0f172a'] },
    xaxis: {
      categories: alpinaProviders.map(p => p.proveedor),
      labels: { formatter: (val) => formatShortCurrency(val) }
    },
    yaxis: {
      labels: { style: { fontSize: '11px', fontWeight: 'bold' } }
    },
    grid: { borderColor: '#1e293b' },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => formatCurrency(val) }
    },
    legend: { position: 'top' }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-950/70 border border-slate-800 px-4 py-2 shadow-lg shadow-slate-950/20">
              <img
                src={alpinaLogo}
                alt="Alpina"
                className="h-9 w-auto"
                loading="lazy"
              />
              <span className="text-slate-300 text-sm uppercase tracking-[0.25em]">Brand Intelligence</span>
            </div>
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-white">Análisis Alpina</h1>
            <p className="text-slate-300 text-sm mt-1">
              Reporte gerencial enfocado exclusivamente en marcas Alpina: ventas reales, participación de portafolio, crecimiento y margen ponderado.
            </p>
          </div>
        </div>

        <GlassCard hoverable={false} className="bg-slate-950/70 border border-sky-500/20 p-6 shadow-[0_25px_80px_-45px_rgba(56,189,248,0.6)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Resumen ejecutivo</p>
              <h2 className="text-xl font-bold text-white mt-1">Top 3 concentra {formatPercent(top3Contribution)} de la facturación</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                {topProvider ? `${topProvider.proveedor} lidera con ${formatPercent(topProviderShare)} de participación en ventas 2026 y un margen promedio ponderado del ${formatPercent(averageMargin)}.` : 'Sin datos de proveedores para el periodo seleccionado.'}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/60 border border-slate-800 p-4">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider">Crecimiento de portafolio</p>
              <p className="text-2xl font-bold text-white mt-1">{formatPercent(portfolioGrowth)}</p>
              <p className="text-slate-400 text-[10px] mt-1">Comparado con 2025</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <GlassCard hoverable={false} className="flex flex-col justify-between bg-sky-950/90 border border-sky-500/20 p-5 shadow-xl shadow-sky-500/5">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ventas 2026</p>
            <h3 className="text-3xl font-bold text-white mt-2">{formatCurrency(totalSales2026)}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Cifras consolidadas del portafolio de proveedores</p>
          </div>
          <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 p-3 w-12 h-12">
            <CircleDollarSign className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex flex-col justify-between bg-slate-950/85 border border-slate-700/50 p-5 shadow-lg shadow-slate-950/20">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Proveedor líder</p>
            <h3 className="text-xl font-bold text-white mt-2">{topProvider ? topProvider.proveedor : 'N/A'}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Participación: {formatPercent(topProviderShare)}</p>
          </div>
          <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-800/70 text-slate-200 p-3 w-12 h-12">
            <Truck className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex flex-col justify-between bg-slate-950/85 border border-slate-700/50 p-5 shadow-lg shadow-slate-950/20">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Margen ponderado</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-2">{formatPercent(averageMargin)}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Margen promedio dentro del portafolio</p>
          </div>
          <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 p-3 w-12 h-12">
            <Percent className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex flex-col justify-between bg-slate-950/85 border border-slate-700/50 p-5 shadow-lg shadow-slate-950/20">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Top 3 proveedores</p>
            <h3 className="text-2xl font-bold text-indigo-400 mt-2">{formatPercent(top3Contribution)}</h3>
            <p className="text-[10px] text-slate-400 mt-2">Contribución conjunta al total 2026</p>
          </div>
          <div className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 p-3 w-12 h-12">
            <BarChart3 className="h-6 w-6" />
          </div>
        </GlassCard>
      </div>

      {/* Treemap & Share Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <h3 className="text-base font-bold text-white mb-2">Mapa de Ventas Alpina</h3>
          <p className="text-xs text-slate-400 mb-4">
            Distribución jerárquica de participación entre las marcas Alpina.
          </p>
          <BITreemapChart data={alpinaProviders} />
        </GlassCard>

        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <h3 className="text-base font-bold text-white mb-4">Cuota de Mercado Alpina</h3>
          <BIDonutChart data={alpinaProviders} />
        </GlassCard>
      </div>

      {/* Comparison Chart */}
      <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
        <h3 className="text-base font-bold text-white mb-2">Comparativo de Ventas 2025 vs 2026</h3>
        <p className="text-xs text-slate-400 mb-4">
          Evolución de ventas Alpina por proveedor en el periodo de análisis.
        </p>
        <Chart options={comparisonOptions} series={comparisonSeries} type="bar" height={340} />
      </GlassCard>

      {/* Detail Providers Table */}
      <GlassCard hoverable={false} className="bg-slate-950/95 border border-slate-800/80 p-5 shadow-lg shadow-slate-950/20">
        <h3 className="text-base font-bold text-white mb-4">Listado y Rendimiento de Proveedores Alpina</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-semibold">
                <th className="pb-3 pl-2">Proveedor</th>
                <th className="pb-3 text-right">Ventas 2025</th>
                <th className="pb-3 text-right">Ventas 2026</th>
                <th className="pb-3 text-right">Proyectado 2026</th>
                <th className="pb-3 text-right">Margen Promedio</th>
                <th className="pb-3 text-right">Crecimiento YoY</th>
                <th className="pb-3 pr-2 text-right">Cuota %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {alpinaProviders.map((item, idx) => {
                const growthRate = item.ventas2025 > 0 ? (item.ventas2026 - item.ventas2025) / item.ventas2025 : 0;
                const marketShare = totalSales2026 > 0 ? item.ventas2026 / totalSales2026 : 0;
                
                return (
                  <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-200">{item.proveedor}</td>
                    <td className="py-3 text-right text-slate-400">{formatCurrency(item.ventas2025)}</td>
                    <td className="py-3 text-right font-semibold text-slate-100">{formatCurrency(item.ventas2026)}</td>
                    <td className="py-3 text-right text-slate-400">{formatCurrency(item.proyectado2026)}</td>
                    <td className="py-3 text-right text-slate-300 font-mono">{(item.margen2026 / 100).toLocaleString('es-CO', {style: 'percent', minimumFractionDigits: 1})}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 font-bold ${
                        growthRate > 0 ? 'text-emerald-400' : growthRate < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {growthRate > 0 ? <ArrowUpRight className="h-3 w-3" /> : growthRate < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {growthRate !== 0 ? formatPercent(growthRate) : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right font-semibold text-blue-400">{formatPercent(marketShare)}</td>
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

export default ProvidersAnalysis;
