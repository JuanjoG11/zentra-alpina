import React, { useMemo } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP, ZONAS_POR_CIUDAD } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import {
  Users, Trophy, ShieldAlert, ArrowUpRight, ArrowDownRight,
  TrendingUp, MapPin, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

// Ciudad de una zona usando el mapa real del cubo
const ciudadDeZona = (zona) => ZONA_CIUDAD_MAP[zona] || 'OTRO';

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',   color: 'blue',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
  MANIZALES: { label: 'Eje Caldas',    color: 'indigo',  bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20'  },
  ARMENIA:   { label: 'Eje Quindío',   color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  OTRO:      { label: 'Otro',          color: 'slate',   bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-700'      },
};

const CityBadge = ({ zona }) => {
  const city = ciudadDeZona(zona);
  const meta = CITY_META[city] || CITY_META.OTRO;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
      <MapPin className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
};

const complianceMeta = (rate) => {
  if (rate >= 1.0)  return { Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (rate >= 0.80) return { Icon: AlertCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10'   };
  return               { Icon: XCircle,       color: 'text-rose-400',    bg: 'bg-rose-500/10'    };
};

const SellersAnalysis = () => {
  const filters = useStore();
  const dbData  = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  const selectedCity = filters.selectedCity || 'Todas';

  // Zonas enriquecidas con ciudad
  const rankedZones = useMemo(() =>
    [...filteredData.zones]
      .map(z => ({ ...z, ciudad: ciudadDeZona(z.zona) }))
      .sort((a, b) => b.ventasNetas - a.ventasNetas),
    [filteredData.zones]
  );

  // Vendedores enriquecidos con ciudad
  const rankedSellers = useMemo(() =>
    [...filteredData.returnsSellers]
      .map(s => ({ ...s, ciudad: ciudadDeZona(s.ejecutivo) }))
      .sort((a, b) => b.ventas - a.ventas),
    [filteredData.returnsSellers]
  );

  // Alertas: tasa devolución > 5%
  const criticalAlerts = rankedSellers.filter(s => s.porcentajeDevolucion > 0.05);

  // Agrupado por eje para resumen
  const byCity = useMemo(() => {
    const map = { PEREIRA: [], MANIZALES: [], ARMENIA: [] };
    rankedZones.forEach(z => { if (map[z.ciudad]) map[z.ciudad].push(z); });
    return map;
  }, [rankedZones]);

  const cityTotals = useMemo(() =>
    Object.entries(byCity).map(([city, zones]) => ({
      city,
      ventas: zones.reduce((s, z) => s + z.ventasNetas, 0),
      presupuesto: zones.reduce((s, z) => s + z.presupuesto, 0),
      zonas: zones.length,
      meta: CITY_META[city]
    })).sort((a, b) => b.ventas - a.ventas),
    [byCity]
  );

  // Chart zonas top
  const chartZones = rankedZones.slice(0, 12);
  const barSeries = [
    { name: 'Ventas Netas',  data: chartZones.map(z => z.ventasNetas)  },
    { name: 'Presupuesto',   data: chartZones.map(z => z.presupuesto)  },
  ];
  const barOptions = {
    chart: { type: 'bar', background: 'transparent', foreColor: '#94a3b8', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#3b82f6', '#1e293b'],
    plotOptions: { bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: chartZones.map(z => z.zona),
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: { labels: { formatter: v => formatShortCurrency(v) } },
    grid: { borderColor: '#1e293b' },
    tooltip: { theme: 'dark', y: { formatter: v => formatCurrency(v) } },
    legend: { position: 'top' },
    annotations: {
      xaxis: chartZones.map((z, i) => ({
        x: z.zona,
        borderColor: 'transparent',
        label: {
          text: ciudadDeZona(z.zona) === 'PEREIRA'   ? 'P' :
                ciudadDeZona(z.zona) === 'MANIZALES' ? 'M' : 'Q',
          style: {
            color: ciudadDeZona(z.zona) === 'PEREIRA'   ? '#60a5fa' :
                   ciudadDeZona(z.zona) === 'MANIZALES' ? '#818cf8' : '#34d399',
            fontSize: '9px', fontWeight: 700,
            background: 'transparent', border: 'none', padding: { top: 2 }
          },
          orientation: 'horizontal',
          offsetY: -4
        }
      }))
    }
  };

  const topZone   = rankedZones[0];
  const topSeller = rankedSellers[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Rendimiento de Vendedores</h1>
        <p className="text-slate-400 text-sm mt-1">
          Zonas y ejecutivos agrupados por eje comercial — Pereira · Caldas · Quindío
        </p>
      </div>

      {/* ── Resumen por eje ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cityTotals.map(({ city, ventas, presupuesto, zonas, meta }) => {
          const rate = presupuesto > 0 ? ventas / presupuesto : 0;
          const cm = complianceMeta(rate);
          const CmIcon = cm.Icon;
          return (
            <GlassCard key={city} hoverable={false} className={`border ${meta.border} relative overflow-hidden`}>
              <div className={`absolute inset-0 ${meta.bg} opacity-30 pointer-events-none rounded-2xl`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${meta.text}`}>{meta.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                    {zonas} zonas
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-white">{formatShortCurrency(ventas)}</p>
                <p className="text-[10px] text-slate-400 mt-1">Presupuesto: {formatShortCurrency(presupuesto)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        rate >= 1 ? 'bg-emerald-500' : rate >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(rate * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${cm.color}`}>{formatPercent(rate)}</span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard hoverable={false} className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Zona Líder</p>
            <h4 className="text-base font-bold text-white mt-0.5 truncate">
              {topZone ? topZone.zona : 'N/A'}
            </h4>
            {topZone && <CityBadge zona={topZone.zona} />}
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mejor Ejecutivo</p>
            <h4 className="text-sm font-bold text-white mt-0.5 truncate">
              {topSeller ? topSeller.nombre : 'N/A'}
            </h4>
            {topSeller && <CityBadge zona={topSeller.ejecutivo} />}
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4 border-rose-950/40 bg-rose-500/[0.02]">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <p className="text-rose-500/80 text-[10px] font-bold uppercase tracking-wider">Alertas &gt;5% Dev</p>
            <h4 className="text-xl font-bold text-white mt-0.5">{criticalAlerts.length} ejecutivos</h4>
            <p className="text-[10px] text-rose-400">Requieren atención</p>
          </div>
        </GlassCard>
      </div>

      {/* ── Chart ventas vs presupuesto ── */}
      <GlassCard hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Ventas Netas vs Presupuesto por Zona</h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="font-bold text-blue-400">P</span> Eje Pereira</span>
            <span className="flex items-center gap-1"><span className="font-bold text-indigo-400">M</span> Eje Caldas</span>
            <span className="flex items-center gap-1"><span className="font-bold text-emerald-400">Q</span> Eje Quindío</span>
          </div>
        </div>
        <Chart options={barOptions} series={barSeries} type="bar" height={300} />
      </GlassCard>

      {/* ── Tabla zonas + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas */}
        <GlassCard hoverable={false} className="border-rose-950/30">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-bold text-white">Alertas Devoluciones</h3>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {criticalAlerts.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-rose-500/10 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{item.nombre}</h4>
                  <CityBadge zona={item.ejecutivo} />
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-rose-400">{formatPercent(item.porcentajeDevolucion)}</span>
                  <p className="text-[9px] text-slate-500 mt-0.5">{formatShortCurrency(item.devoluciones)}</p>
                </div>
              </div>
            ))}
            {criticalAlerts.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">Sin alertas activas.</p>
            )}
          </div>
        </GlassCard>

        {/* Tabla zonas */}
        <GlassCard hoverable={false} className="col-span-1 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4">Desempeño por Zona</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full min-w-[480px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold sticky top-0 bg-slate-950/90 backdrop-blur-sm">
                  <th className="pb-3 pl-2">Zona</th>
                  <th className="pb-3">Eje</th>
                  <th className="pb-3 hidden sm:table-cell">Vendedor</th>
                  <th className="pb-3 text-right">Ventas</th>
                  <th className="pb-3 text-right">Cumpl.</th>
                  <th className="pb-3 text-right pr-2 hidden sm:table-cell">Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {rankedZones.map((z, i) => {
                  const rate = z.presupuesto > 0 ? z.ventasNetas / z.presupuesto : 0;
                  const cm = complianceMeta(rate);
                  const CmIcon = cm.Icon;
                  const meta = CITY_META[z.ciudad] || CITY_META.OTRO;
                  return (
                    <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-2.5 pl-2 font-bold text-slate-200">{z.zona}</td>
                      <td className="py-2.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px] max-w-[140px] truncate hidden sm:table-cell">{z.vendedor}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-100">{formatShortCurrency(z.ventasNetas)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`flex items-center justify-end gap-1 font-bold ${cm.color}`}>
                          <CmIcon className="h-3 w-3" />
                          {formatPercent(rate)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right pr-2 font-mono text-slate-400 hidden sm:table-cell">{z.facturas.toLocaleString('es-CO')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* ── Tabla vendedores con ciudad ── */}
      <GlassCard hoverable={false}>
        <h3 className="text-sm font-bold text-white mb-4">Ejecutivos Comerciales · Ventas y Calidad de Entrega</h3>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[520px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                <th className="pb-3 pl-2">Ejecutivo</th>
                <th className="pb-3 hidden sm:table-cell">Eje</th>
                <th className="pb-3 text-right">Ventas</th>
                <th className="pb-3 text-right hidden sm:table-cell">Devoluciones</th>
                <th className="pb-3 text-right">Tasa Dev.</th>
                <th className="pb-3 text-right pr-2">Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {rankedSellers.map((s, i) => {
                const meta = CITY_META[s.ciudad] || CITY_META.OTRO;
                const isAlert = s.porcentajeDevolucion > 0.05;
                return (
                  <tr key={i} className={`hover:bg-slate-900/20 transition-colors ${isAlert ? 'bg-rose-950/10' : ''}`}>
                    <td className="py-2.5 pl-2 font-bold text-slate-200 max-w-[150px] truncate">{s.nombre}</td>
                    <td className="py-2.5 hidden sm:table-cell">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-100">{formatShortCurrency(s.ventas)}</td>
                    <td className="py-2.5 text-right text-rose-400 font-semibold hidden sm:table-cell">{formatShortCurrency(s.devoluciones)}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-bold ${isAlert ? 'text-rose-400' : s.porcentajeDevolucion <= 0.02 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {formatPercent(s.porcentajeDevolucion)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full rounded-full ${s.porcentajeDevolucion <= 0.02 ? 'bg-emerald-500' : s.porcentajeDevolucion <= 0.05 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.max(0, (1 - s.porcentajeDevolucion) * 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${s.porcentajeDevolucion <= 0.02 ? 'text-emerald-400' : s.porcentajeDevolucion <= 0.05 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {formatPercent(1 - s.porcentajeDevolucion)}
                        </span>
                      </div>
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

export default SellersAnalysis;
