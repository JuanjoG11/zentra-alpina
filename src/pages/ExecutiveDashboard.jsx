import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import {
  BILineChart,
  BIStackedBarChart,
  BIDonutChart,
  BIGaugeChart,
  BIWaterfallChart,
  BIFunnelChart,
  BIZoneRankingChart
} from '../components/charts/BICharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Building,
  MapPin,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Minus,
  Monitor
} from 'lucide-react';

// ─── Semáforo helpers ────────────────────────────────────────────────
const trafficLight = (pct) => {
  if (pct >= 1.0)  return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle2,  label: 'Cumplido' };
  if (pct >= 0.80) return { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: AlertCircle,    label: 'En riesgo' };
  return             { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    Icon: XCircle,        label: 'Crítico'   };
};

// ─── Daily Sales Table ────────────────────────────────────────────────
const PRESUPUESTO_JUNIO = 4001885288;
const DIAS_HABILES_MES  = 25;
const DIA_HABIL_ACTUAL  = 13;
const META_DIARIA       = PRESUPUESTO_JUNIO / DIAS_HABILES_MES;          // ~$160.075.412
const META_ACUMULADA    = META_DIARIA * DIA_HABIL_ACTUAL;                // Meta al día 13

const DailySalesTable = ({ salesDaily }) => {
  const [showAll, setShowAll] = useState(false);

  const rows = [...salesDaily]
    .filter(d => d.fecha && d.fecha !== 'general' && !isNaN(new Date(d.fecha).getTime()))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const displayed = showAll ? rows : rows.slice(0, 8);

  // Totales reales acumulados
  const totalAcumulado = rows.reduce((s, d) => s + (d.total || 0), 0);
  const vsMetaAcum     = META_ACUMULADA > 0 ? totalAcumulado / META_ACUMULADA : 0;
  const tlAcum         = trafficLight(vsMetaAcum);
  const TlAcumIcon     = tlAcum.Icon;

  if (rows.length === 0) return (
    <p className="text-slate-500 text-sm text-center py-8">Sin datos de ventas diarias cargados.</p>
  );

  return (
    <div className="space-y-3">
      {/* ── Resumen acumulado ── */}
      <div className={`rounded-xl border ${tlAcum.border} ${tlAcum.bg} px-4 py-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Acumulado real · Día hábil {DIA_HABIL_ACTUAL}/{DIAS_HABILES_MES}
            </p>
            <p className="text-lg font-extrabold text-white mt-0.5">{formatCurrency(totalAcumulado)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Meta acumulada: <span className="text-slate-200 font-semibold">{formatCurrency(META_ACUMULADA)}</span>
              &nbsp;·&nbsp; Meta día: <span className="text-slate-200 font-semibold">{formatShortCurrency(META_DIARIA)}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={`flex items-center gap-1.5 text-sm font-extrabold ${tlAcum.color}`}>
              <TlAcumIcon className="h-4 w-4" />
              {formatPercent(vsMetaAcum)} de meta acumulada
            </div>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  vsMetaAcum >= 1 ? 'bg-emerald-500' : vsMetaAcum >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(vsMetaAcum * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500">{DIA_HABIL_ACTUAL} de {DIAS_HABILES_MES} días hábiles</p>
          </div>
        </div>
      </div>

      {/* ── Encabezado tabla ── */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_80px_72px] gap-x-3 px-3 pb-1 border-b border-slate-800/60">
        {['Fecha','Contado','Crédito','Total día','vs Meta'].map(h => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</span>
        ))}
      </div>

      <div className="space-y-1">
        {displayed.map((d, i) => {
          const dateObj = new Date(d.fecha);
          const label = dateObj.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
          const pct = META_DIARIA > 0 ? d.total / META_DIARIA : 0;
          const tl = trafficLight(pct);
          const TlIcon = tl.Icon;

          return (
            <div key={i} className={`rounded-lg border ${tl.border} ${tl.bg} hover:brightness-110 transition-all px-3 py-2.5`}>
              <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_80px_72px] gap-x-3 items-center">
                <span className="text-xs font-semibold text-slate-200 capitalize">{label}</span>
                <span className="text-xs text-emerald-400 font-medium">{formatShortCurrency(d.contado)}</span>
                <span className="text-xs text-amber-400 font-medium">{formatShortCurrency(d.credito)}</span>
                <span className="text-xs font-bold text-white">{formatShortCurrency(d.total)}</span>
                <div className="flex items-center gap-1">
                  <TlIcon className={`h-3.5 w-3.5 shrink-0 ${tl.color}`} />
                  <span className={`text-[10px] font-bold ${tl.color}`}>{formatPercent(pct)}</span>
                </div>
              </div>
              <div className="sm:hidden flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 capitalize">{label}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    <span className="text-emerald-400">{formatShortCurrency(d.contado)}</span>
                    <span className="mx-1 text-slate-600">+</span>
                    <span className="text-amber-400">{formatShortCurrency(d.credito)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatShortCurrency(d.total)}</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <TlIcon className={`h-3 w-3 ${tl.color}`} />
                    <span className={`text-[10px] font-bold ${tl.color}`}>{formatPercent(pct)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length > 8 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2 flex items-center justify-center gap-1 transition-colors"
        >
          {showAll ? <><ChevronUp className="h-3.5 w-3.5"/>Ver menos</> : <><ChevronDown className="h-3.5 w-3.5"/>Ver todos ({rows.length} días)</>}
        </button>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────
const ExecutiveDashboard = () => {
  const dbData = useStore(state => state.dbData);
  const filters = useStore();
  const navigate = useNavigate();

  // Date range filter (local state — no afecta otros módulos)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Apply date filter to salesDaily before calculating KPIs
  const filteredDbData = useMemo(() => {
    if (!dateFrom && !dateTo) return dbData;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to   = dateTo   ? new Date(dateTo)   : null;
    return {
      ...dbData,
      salesDaily: (dbData.salesDaily || []).filter(d => {
        const dt = new Date(d.fecha);
        if (isNaN(dt.getTime())) return false;
        if (from && dt < from) return false;
        if (to   && dt > to)   return false;
        return true;
      }),
      returnsDaily: (dbData.returnsDaily || []).filter(d => {
        const dt = new Date(d.fecha);
        if (isNaN(dt.getTime())) return false;
        if (from && dt < from) return false;
        if (to   && dt > to)   return false;
        return true;
      })
    };
  }, [dbData, dateFrom, dateTo]);

  const filteredData = getFilteredData(filteredDbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Period label from data
  const activePeriodLabel = useMemo(() => {
    const valid = (filteredData.salesDaily || [])
      .filter(d => d.fecha && d.fecha !== 'general')
      .map(d => new Date(d.fecha)).filter(d => !isNaN(d.getTime()));
    if (!valid.length) return 'Abril 2026';
    valid.sort((a,b) => b-a);
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[valid[0].getMonth()]} ${valid[0].getFullYear()}`;
  }, [filteredData.salesDaily]);

  // Clear date filter
  const clearDates = () => { setDateFrom(''); setDateTo(''); };

  const kpiCards = [
    {
      title: 'Ventas Brutas',
      value: formatCurrency(kpis.totalSales),
      subtitle: `Cierre de ${activePeriodLabel}`,
      icon: DollarSign,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400',
      badge: kpis.growth,
      badgeLabel: 'vs año anterior',
      trend: kpis.growth > 0 ? 'up' : 'down'
    },
    {
      title: 'Ventas Netas',
      value: formatCurrency(kpis.netSales),
      subtitle: 'Ventas menos Devoluciones',
      icon: ShoppingBag,
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      badge: kpis.compliance,
      badgeLabel: 'cumplimiento meta',
      trend: kpis.compliance >= 1 ? 'up' : 'down'
    },
    {
      title: 'Devoluciones',
      value: formatCurrency(kpis.totalReturns),
      subtitle: `${formatPercent(kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0)} del total bruto`,
      icon: TrendingDown,
      color: 'from-rose-500/20 to-pink-500/20',
      iconColor: 'text-rose-400',
      badge: kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0,
      badgeLabel: 'tasa de devolución',
      trend: 'alert'
    },
    {
      title: 'Ticket Promedio',
      value: formatCurrency(kpis.averageTicket),
      subtitle: `Sobre ${kpis.totalFacturas.toLocaleString('es-CO')} facturas`,
      icon: Percent,
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      badge: undefined,
      badgeLabel: 'Monto promedio por factura',
      trend: 'neutral'
    }
  ];

  const devRate = kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0;
  const isDevAlert = devRate > 0.035;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Ejecutivo</h1>
          <p className="text-slate-400 text-sm mt-1">
            Análisis consolidado · Alpina Eje Cafetero · {activePeriodLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Modo TV */}
          <button
            onClick={() => navigate('/tv')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl"
            title="Activar modo presentación TV"
          >
            <Monitor className="h-4 w-4" />
            Modo TV
          </button>

          {/* ── Filtro de fechas ── */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 shadow-inner">
            <CalendarDays className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] text-slate-500 font-medium">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-32 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 shadow-inner">
            <CalendarDays className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-[11px] text-slate-500 font-medium">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-32 cursor-pointer"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={clearDates}
              className="text-[11px] text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg px-3 py-2 bg-rose-500/5 hover:bg-rose-500/10 transition-all font-medium"
            >
              Limpiar
            </button>
          )}
          {/* Active filter badges */}
          {filters.selectedZone !== 'Todas' && (
            <span className="px-2.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-medium">
              Zona: {filters.selectedZone}
            </span>
          )}
          {filters.selectedSeller !== 'Todas' && (
            <span className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              Vendedor: {filters.selectedSeller}
            </span>
          )}
        </div>
      </div>

      {/* ── Alerta devoluciones si supera umbral ── */}
      {isDevAlert && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/5 animate-pulse">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300 font-medium">
            Alerta: la tasa de devoluciones supera el umbral crítico del 3,5% — actualmente en <strong>{formatPercent(devRate)}</strong>.
          </p>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <GlassCard key={idx} className="overflow-hidden relative">
              {/* Accent glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-40 pointer-events-none rounded-2xl`} />
              <div className="relative flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{card.title}</p>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">{card.value}</h3>
                  <p className="text-[10px] text-slate-400 font-medium">{card.subtitle}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${card.color} ${card.iconColor} shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="relative mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{card.badgeLabel}</span>
                {card.badge !== undefined && (
                  <span className={`flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    card.trend === 'up'    ? 'bg-emerald-500/10 text-emerald-400' :
                    card.trend === 'alert' ? 'bg-rose-500/10 text-rose-400'      :
                    card.trend === 'down'  ? 'bg-rose-500/10 text-rose-400'      :
                                            'bg-slate-800 text-slate-300'
                  }`}>
                    {card.trend === 'up'    && <ArrowUpRight className="h-3 w-3" />}
                    {card.trend === 'down'  && <ArrowDownRight className="h-3 w-3" />}
                    {card.trend === 'alert' && <ArrowUpRight className="h-3 w-3" />}
                    {formatPercent(card.badge)}
                  </span>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Top Performers ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Mejor Proveedor',       value: kpis.topProvider, icon: Building,  color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
          { label: 'Mejor Vendedor',         value: kpis.topSeller,   icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Zona Líder en Ventas',   value: `Zona ${kpis.topZone}`, icon: MapPin,    color: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <GlassCard key={i} hoverable={false} className="flex items-center gap-4 py-3.5">
              <div className={`p-3 rounded-xl ${item.bg} ${item.color} shrink-0`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
                <h4 className="text-sm font-bold text-slate-100 truncate mt-0.5">{item.value}</h4>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Gauge + Tendencia diaria ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard hoverable={false} className="col-span-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-white">Cumplimiento Global</h3>
            <span className="text-xs text-slate-400 font-semibold">{formatPercent(kpis.compliance)} de la Meta</span>
          </div>
          <BIGaugeChart val={kpis.compliance} />
          {/* Mini stats below gauge */}
          <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-slate-800/40">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Presupuesto</p>
              <p className="text-sm font-bold text-slate-200 mt-0.5">{formatShortCurrency(kpis.totalBudget)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ventas Netas</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatShortCurrency(kpis.netSales)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">Tendencia Diaria de Ventas</h3>
          <BILineChart data={filteredData.salesDaily} />
        </GlassCard>
      </div>

      {/* ── Tabla semáforo + Ranking zonas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla semáforo */}
        <GlassCard hoverable={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Ventas por Día</h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"/>Cumplido</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block"/>En riesgo</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500 inline-block"/>Crítico</span>
            </div>
          </div>
          <DailySalesTable salesDaily={filteredData.salesDaily} />
        </GlassCard>

        {/* Ranking zonas */}
        <GlassCard hoverable={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Ranking de Zonas</h3>
            <span className="text-[10px] text-slate-500 font-medium">Ventas vs Presupuesto</span>
          </div>
          <BIZoneRankingChart zones={filteredData.zones} />
        </GlassCard>
      </div>

      {/* ── Contado vs Crédito + Donut proveedores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">Composición de Ventas: Contado vs Crédito</h3>
          <BIStackedBarChart data={filteredData.salesDaily} />
        </GlassCard>
        <GlassCard hoverable={false} className="col-span-1">
          <h3 className="text-sm font-bold text-white mb-3">Participación por Proveedor</h3>
          <BIDonutChart data={filteredData.providers} />
        </GlassCard>
      </div>

      {/* ── Puente financiero + Conceptos devoluciones ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hoverable={false}>
          <h3 className="text-sm font-bold text-white mb-3">Puente: Ventas Brutas → Netas</h3>
          <BIWaterfallChart sales={kpis.totalSales} returns={kpis.totalReturns} />
        </GlassCard>
        <GlassCard hoverable={false}>
          <h3 className="text-sm font-bold text-white mb-3">Conceptos de Devoluciones</h3>
          <BIFunnelChart data={filteredData.returnsConcepts} />
        </GlassCard>
      </div>

    </div>
  );
};

export default ExecutiveDashboard;
