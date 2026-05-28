import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { 
  formatCurrency, 
  formatPercent, 
  formatShortCurrency 
} from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { 
  BILineChart,
  BIAreaChart,
  BIStackedBarChart,
  BIDonutChart,
  BIGaugeChart,
  BIWaterfallChart,
  BIFunnelChart
} from '../components/charts/BICharts';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  UserCheck,
  Building,
  MapPin
} from 'lucide-react';

const ExecutiveDashboard = () => {
  const filters = useStore();
  const filteredData = getFilteredData(filters);
  const kpis = calculateKPIs(filteredData);

  const kpiCards = [
    {
      title: 'Ventas Totales (Brutas)',
      value: formatCurrency(kpis.totalSales),
      subtitle: 'Cierre de Abril 2026',
      icon: DollarSign,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      percentage: kpis.growth,
      percentageLabel: 'vs año anterior',
      trend: kpis.growth > 0 ? 'up' : 'down'
    },
    {
      title: 'Ventas Netas',
      value: formatCurrency(kpis.netSales),
      subtitle: 'Ventas menos Devoluciones',
      icon: ShoppingBag,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      percentage: kpis.compliance,
      percentageLabel: 'cumplimiento meta',
      trend: kpis.compliance >= 1 ? 'up' : 'down'
    },
    {
      title: 'Devoluciones Totales',
      value: formatCurrency(kpis.totalReturns),
      subtitle: `${formatPercent(kpis.totalReturns / kpis.totalSales)} del total bruto`,
      icon: TrendingDown,
      color: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-400',
      percentage: kpis.totalReturns / kpis.totalSales,
      percentageLabel: 'tasa de devolución',
      trend: 'down' // Red means bad
    },
    {
      title: 'Ticket Promedio',
      value: formatCurrency(kpis.averageTicket),
      subtitle: `Calculado sobre ${kpis.totalFacturas.toLocaleString()} facturas`,
      icon: Percent,
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      percentageLabel: 'Monto de facturación promedio',
      trend: 'neutral'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Ejecutivo</h1>
          <p className="text-slate-400 text-sm mt-1">
            Análisis consolidado para la gerencia de Alpina. Información de ventas, cumplimiento y devoluciones.
          </p>
        </div>
        
        {/* Dynamic Badges based on Filters */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            Periodo: {filters.selectedPeriod === 'abril-2026' ? 'Abril 2026' : filters.selectedPeriod}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium">
            Sede: {filters.selectedCity}
          </span>
          {filters.selectedProvider !== 'Todas' && (
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
              Proveedor: {filters.selectedProvider}
            </span>
          )}
          {filters.selectedZone !== 'Todas' && (
            <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
              Zona: {filters.selectedZone}
            </span>
          )}
          {filters.selectedSeller !== 'Todas' && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              Vendedor: {filters.selectedSeller}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <GlassCard key={idx} className="overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{card.value}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{card.subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${card.color} ${card.iconColor} shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              
              {/* Card Footer Trend Indicator */}
              <div className="mt-4 pt-4 border-t border-slate-800/40 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{card.percentageLabel}</span>
                {card.percentage !== undefined && (
                  <span className={`flex items-center gap-0.5 font-semibold px-2 py-0.5 rounded-full ${
                    card.trend === 'up' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : card.trend === 'down' && card.title.includes('Devoluciones')
                        ? 'bg-rose-500/10 text-rose-400'
                        : card.trend === 'down'
                          ? 'bg-rose-500/10 text-rose-400' 
                          : 'bg-slate-800 text-slate-300'
                  }`}>
                    {card.trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : card.trend === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
                    {formatPercent(card.percentage)}
                  </span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Top Performers Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard hoverable={false} className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Mejor Proveedor</p>
            <h4 className="text-sm font-bold text-slate-100">{kpis.topProvider}</h4>
          </div>
        </GlassCard>
        <GlassCard hoverable={false} className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Mejor Vendedor (Devoluciones)</p>
            <h4 className="text-sm font-bold text-slate-100">{kpis.topSeller}</h4>
          </div>
        </GlassCard>
        <GlassCard hoverable={false} className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Mejor Zona Comercial</p>
            <h4 className="text-sm font-bold text-slate-100">Zona {kpis.topZone}</h4>
          </div>
        </GlassCard>
      </div>

      {/* Charts Grid - Level 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Gauge */}
        <GlassCard hoverable={false} className="col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">Cumplimiento Global</h3>
            <span className="text-xs text-slate-400 font-semibold">{formatPercent(kpis.compliance)} de la Meta</span>
          </div>
          <BIGaugeChart val={kpis.compliance} />
        </GlassCard>

        {/* Daily Sales Trend */}
        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-4">Tendencia Diaria de Ventas</h3>
          <BILineChart data={filteredData.salesDaily} />
        </GlassCard>
      </div>

      {/* Charts Grid - Level 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash vs Credit */}
        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-4">Composición de Ventas: Contado vs Crédito</h3>
          <BIStackedBarChart data={filteredData.salesDaily} />
        </GlassCard>

        {/* Provider Participation Donut */}
        <GlassCard hoverable={false} className="col-span-1">
          <h3 className="text-base font-bold text-white mb-4">Participación por Proveedores</h3>
          <BIDonutChart data={filteredData.providers} />
        </GlassCard>
      </div>

      {/* Charts Grid - Level 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waterfall net sales bridge */}
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Puente Financiero: Ventas Brutas a Netas</h3>
          <BIWaterfallChart sales={kpis.totalSales} returns={kpis.totalReturns} />
        </GlassCard>

        {/* Funnel of Return Concepts */}
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Conceptos Críticos de Devoluciones</h3>
          <BIFunnelChart data={filteredData.returnsConcepts} />
        </GlassCard>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
