import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP, countCalendarBusinessDays, getDiasHabiles } from '../utils/calculations';

import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import alpinaLogo from '../assets/alpina-logo.svg';
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Users,
  MapPin, Truck, X, Target, Activity, ShieldAlert,
  CheckCircle2, AlertTriangle, Award, ChevronLeft, ChevronRight,
  Package, Zap
} from 'lucide-react';

const VIEWS = [
  'KPIs Generales',
  'Cumplimiento Meta',
  'Top Zonas',
  'Ejecutivos',
  'Proveedores',
  'Alertas Canal',
];
const ROTATION_INTERVAL = 12000;

// ─── helpers ──────────────────────────────────────────────────────────────────
const ciudadLabel = (zona) => {
  const c = ZONA_CIUDAD_MAP[zona];
  if (c === 'PEREIRA')   return { label: 'Pereira',   color: 'text-blue-400',    dot: 'bg-blue-500'    };
  if (c === 'MANIZALES') return { label: 'Caldas',    color: 'text-indigo-400',  dot: 'bg-indigo-500'  };
  if (c === 'ARMENIA')   return { label: 'Quindío',   color: 'text-emerald-400', dot: 'bg-emerald-500' };
  return { label: 'Otro', color: 'text-slate-400', dot: 'bg-slate-500' };
};

// ─── Shared animated number ───────────────────────────────────────────────────
const BigKPI = ({ label, value, sub, color = 'text-white', accent = 'from-blue-500/20 to-cyan-500/20', border = 'border-blue-500/30', icon: Icon }) => (
  <div className={`bg-gradient-to-br ${accent} backdrop-blur-xl rounded-3xl border ${border} p-8 flex flex-col justify-between h-full`}>
    <div className="flex items-start justify-between">
      <p className={`text-sm font-bold uppercase tracking-widest ${color} opacity-80`}>{label}</p>
      {Icon && <Icon className={`h-8 w-8 ${color} opacity-60`} />}
    </div>
    <div>
      <h2 className={`text-6xl xl:text-7xl font-black ${color} tracking-tight leading-none mb-3`}>{value}</h2>
      {sub && <p className="text-slate-400 text-lg font-medium">{sub}</p>}
    </div>
  </div>
);

// ─── Progress bar row ─────────────────────────────────────────────────────────
const ProgressRow = ({ rank, name, sub, value, pct, color = 'bg-blue-500', textColor = 'text-white', badge }) => (
  <div className="flex items-center gap-5 py-4 border-b border-slate-800/60 last:border-0">
    <span className="text-4xl font-black text-slate-700 w-12 shrink-0 text-center">#{rank}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <h3 className={`text-2xl font-bold ${textColor} truncate`}>{name}</h3>
        {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>}
      </div>
      {sub && <p className="text-slate-500 text-sm">{sub}</p>}
      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
        </div>
        <span className={`text-base font-bold ${textColor} w-16 text-right`}>{formatPercent(pct)}</span>
      </div>
    </div>
    <div className="text-right shrink-0 ml-2">
      <p className="text-2xl font-extrabold text-white">{formatShortCurrency(value)}</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const TVDashboard = () => {
  const navigate = useNavigate();
  const dbData = useStore(state => state.dbData);
  const currentWorkDay = useStore(state => state.currentWorkDay);
  const filters = useStore();

  const [currentView, setCurrentView] = useState(0);
  const [isPaused, setIsPaused]       = useState(false);
  const [time, setTime]               = useState(new Date());
  const [progress, setProgress]       = useState(0);

  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-rotación con barra de progreso
  useEffect(() => {
    if (isPaused) return;
    setProgress(0);
    const step = 100 / (ROTATION_INTERVAL / 100);
    const prog = setInterval(() => setProgress(p => Math.min(p + step, 100)), 100);
    const rot  = setTimeout(() => {
      setCurrentView(v => (v + 1) % VIEWS.length);
      setProgress(0);
    }, ROTATION_INTERVAL);
    return () => { clearInterval(prog); clearTimeout(rot); };
  }, [currentView, isPaused]);

  const activePeriodLabel = useMemo(() => {
    const valid = (filteredData.salesDaily || [])
      .filter(d => d.fecha && d.fecha !== 'general')
      .map(d => new Date(d.fecha)).filter(d => !isNaN(d.getTime()));
    if (!valid.length) return 'Junio 2026';
    valid.sort((a, b) => b - a);
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[valid[0].getMonth()]} ${valid[0].getFullYear()}`;
  }, [filteredData.salesDaily]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const devRate = kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0;
  const totalBudget = kpis.totalBudget;

  const topZones = useMemo(() =>
    [...filteredData.zones].sort((a, b) => b.ventasNetas - a.ventasNetas).slice(0, 8),
  [filteredData.zones]);

  const topSellers = useMemo(() =>
    [...filteredData.returnsSellers]
      .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE')
      .sort((a, b) => b.ventas - a.ventas).slice(0, 8),
  [filteredData.returnsSellers]);

  const topProviders = useMemo(() =>
    [...filteredData.providers].sort((a, b) => b.ventas2026 - a.ventas2026).slice(0, 8),
  [filteredData.providers]);

  // Máx valores para barras relativas
  const maxZone    = topZones[0]?.ventasNetas    || 1;
  const maxSeller  = topSellers[0]?.ventas       || 1;
  const maxProvider = topProviders[0]?.ventas2026 || 1;

  // Zonas por eje para vista de cumplimiento
  const ejeStats = useMemo(() => {
    const map = { PEREIRA: { ventas: 0, presupuesto: 0, zonas: 0 }, MANIZALES: { ventas: 0, presupuesto: 0, zonas: 0 }, ARMENIA: { ventas: 0, presupuesto: 0, zonas: 0 } };
    filteredData.zones.forEach(z => {
      const c = ZONA_CIUDAD_MAP[z.zona];
      if (map[c]) { map[c].ventas += z.ventasNetas; map[c].presupuesto += z.presupuesto; map[c].zonas++; }
    });
    return [
      { name: 'Eje Pereira',  ...map.PEREIRA,  accent: 'from-blue-600/20 to-cyan-600/20',    border: 'border-blue-500/30',    color: 'text-blue-400'    },
      { name: 'Eje Caldas',   ...map.MANIZALES, accent: 'from-indigo-600/20 to-purple-600/20', border: 'border-indigo-500/30',  color: 'text-indigo-400'  },
      { name: 'Eje Quindío',  ...map.ARMENIA,   accent: 'from-emerald-600/20 to-teal-600/20',  border: 'border-emerald-500/30', color: 'text-emerald-400' },
    ];
  }, [filteredData.zones]);

  // Alertas para vista 5
  const alerts = useMemo(() => {
    const list = [];
    filteredData.returnsSellers
      .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE' && s.porcentajeDevolucion > 0.08)
      .slice(0, 3)
      .forEach(s => list.push({ type: 'danger', icon: ShieldAlert, title: `${s.nombre}`, msg: `Devolución crítica: ${formatPercent(s.porcentajeDevolucion)}` }));
    filteredData.zones
      .filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto < 0.6)
      .slice(0, 2)
      .forEach(z => list.push({ type: 'warning', icon: AlertTriangle, title: `Zona ${z.zona}`, msg: `Solo ${formatPercent(z.ventasNetas / z.presupuesto)} del presupuesto` }));
    if (devRate > 0.06) list.push({ type: 'warning', icon: TrendingDown, title: 'Tasa de devolución global', msg: `${formatPercent(devRate)} — por encima del umbral 6%` });
    // positivas
    filteredData.zones
      .filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto >= 1.1)
      .slice(0, 2)
      .forEach(z => list.push({ type: 'success', icon: Award, title: `Zona ${z.zona} ⭐`, msg: `${formatPercent(z.ventasNetas / z.presupuesto)} de cumplimiento` }));
    return list;
  }, [filteredData, devRate]);

  // Días hábil para proyección
  const workDay = currentWorkDay > 0 ? currentWorkDay : countCalendarBusinessDays(filteredData.salesDaily);
  const totalBD_tv = getDiasHabiles(useStore.getState().selectedPeriod);

  const proyectedEOM = kpis.totalSales > 0 ? Math.round(kpis.totalSales / workDay * totalBD_tv) : 0;
  const proyEOMCompliance = totalBudget > 0 ? proyectedEOM / totalBudget : 0;

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden select-none">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-500/10 blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[180px] animate-pulse" />
        <div className="absolute top-[40%] right-[25%] w-[35%] h-[35%] rounded-full bg-emerald-500/8 blur-[140px] animate-pulse" />
      </div>

      <div className="relative z-10 h-full flex flex-col px-10 pt-6 pb-4">
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-5">
            <img src={alpinaLogo} alt="Alpina" className="h-14 w-auto" />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Alpina · Eje Cafetero</h1>
              <p className="text-slate-400 text-base mt-0.5">{activePeriodLabel} · Día hábil <strong className="text-white">{workDay}</strong> / {totalBD_tv}</p>
            </div>
          </div>

          {/* Reloj */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-5xl font-black text-white tabular-nums">{time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              <p className="text-slate-400 text-sm mt-0.5 capitalize">{time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsPaused(p => !p)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors border border-slate-700">
                {isPaused ? '▶ Reanudar' : '⏸ Pausar'}
              </button>
              <button onClick={() => navigate('/')}
                className="p-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-400 transition-colors" title="Salir">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── NAV PILLS ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5 shrink-0 overflow-x-auto pb-1">
          {VIEWS.map((v, i) => (
            <button key={i} onClick={() => { setCurrentView(i); setProgress(0); }}
              className={`px-4 py-1.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                i === currentView
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-900/60 text-slate-500 hover:text-white border border-slate-800'
              }`}>
              {v}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button onClick={() => { setCurrentView(v => (v - 1 + VIEWS.length) % VIEWS.length); setProgress(0); }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => { setCurrentView(v => (v + 1) % VIEWS.length); setProgress(0); }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">

          {/* ── VISTA 0: KPIs GENERALES ─────────────────────────────────── */}
          {currentView === 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 h-full">
              <BigKPI label="Ventas Brutas" value={formatShortCurrency(kpis.totalSales)}
                sub={`${formatPercent(kpis.growth)} vs año anterior`}
                accent="from-blue-600/20 to-cyan-600/20" border="border-blue-500/30"
                color="text-blue-300" icon={DollarSign} />
              <BigKPI label="Ventas Netas" value={formatShortCurrency(kpis.netSales)}
                sub={`Cumplimiento: ${formatPercent(kpis.compliance)}`}
                accent="from-emerald-600/20 to-teal-600/20" border="border-emerald-500/30"
                color="text-emerald-300" icon={TrendingUp} />
              <BigKPI label="Devoluciones" value={formatShortCurrency(kpis.totalReturns)}
                sub={`${formatPercent(devRate)} del total bruto${devRate > 0.05 ? ' ⚠️' : ''}`}
                accent="from-rose-600/20 to-pink-600/20" border="border-rose-500/30"
                color="text-rose-300" icon={TrendingDown} />
              <div className="flex flex-col gap-5 h-full">
                <BigKPI label="Ticket Promedio" value={formatShortCurrency(kpis.averageTicket)}
                  sub={`${kpis.totalFacturas.toLocaleString('es-CO')} facturas`}
                  accent="from-amber-600/20 to-orange-600/20" border="border-amber-500/30"
                  color="text-amber-300" icon={Percent} />
                <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 backdrop-blur-xl rounded-3xl border border-violet-500/30 p-6 flex flex-col justify-between flex-1">
                  <p className="text-sm font-bold uppercase tracking-widest text-violet-300 opacity-80 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Proyección Cierre
                  </p>
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-2">{formatShortCurrency(proyectedEOM)}</h2>
                    <p className="text-slate-400 text-sm">
                      {proyEOMCompliance >= 1
                        ? <span className="text-emerald-400 font-bold">✓ Meta alcanzable ({formatPercent(proyEOMCompliance)})</span>
                        : <span className="text-amber-400 font-bold">~ {formatPercent(proyEOMCompliance)} proyectado</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 1: CUMPLIMIENTO META POR EJE ─────────────────────── */}
          {currentView === 1 && (
            <div className="flex flex-col gap-5 h-full">
              {/* Cards por eje */}
              <div className="grid grid-cols-3 gap-5">
                {ejeStats.map((eje, i) => {
                  const rate = eje.presupuesto > 0 ? eje.ventas / eje.presupuesto : 0;
                  return (
                    <div key={i} className={`bg-gradient-to-br ${eje.accent} backdrop-blur-xl rounded-3xl border ${eje.border} p-7`}>
                      <p className={`text-sm font-bold uppercase tracking-widest ${eje.color} mb-3`}>{eje.name}</p>
                      <p className="text-5xl font-black text-white mb-2">{formatShortCurrency(eje.ventas)}</p>
                      <p className="text-slate-400 text-sm mb-4">Presupuesto: {formatShortCurrency(eje.presupuesto)} · {eje.zonas} zonas</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${rate >= 1 ? 'bg-emerald-500' : rate >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(rate * 100, 100)}%` }} />
                        </div>
                        <span className={`text-xl font-black ${rate >= 1 ? 'text-emerald-400' : rate >= 0.8 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {formatPercent(rate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Gauge global */}
              <div className="flex-1 bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 p-7 flex items-center gap-10">
                <div className="flex-1">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Cumplimiento Consolidado</p>
                  <p className={`text-8xl font-black mb-3 ${kpis.compliance >= 1 ? 'text-emerald-400' : kpis.compliance >= 0.8 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {formatPercent(kpis.compliance)}
                  </p>
                  <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${kpis.compliance >= 1 ? 'bg-emerald-500' : kpis.compliance >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(kpis.compliance * 100, 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 shrink-0">
                  {[
                    { label: 'Presupuesto', value: formatShortCurrency(totalBudget), color: 'text-slate-300' },
                    { label: 'Ventas Netas', value: formatShortCurrency(kpis.netSales), color: 'text-emerald-400' },
                    { label: 'Proyección fin de mes', value: formatShortCurrency(proyectedEOM), color: 'text-violet-400' },
                    { label: 'Devoluciones', value: formatShortCurrency(kpis.totalReturns), color: 'text-rose-400' },
                  ].map((item, j) => (
                    <div key={j} className="bg-slate-800/40 rounded-2xl p-4 text-center">
                      <p className="text-slate-500 text-xs uppercase font-bold mb-1">{item.label}</p>
                      <p className={`text-2xl font-extrabold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 2: TOP ZONAS ──────────────────────────────────────── */}
          {currentView === 2 && (
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-1">
                <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-2 shrink-0">
                  <MapPin className="h-7 w-7 text-blue-400" /> Ranking de Zonas
                </h2>
                {topZones.map((zone, i) => {
                  const compliance = zone.presupuesto > 0 ? zone.ventasNetas / zone.presupuesto : 0;
                  const c = ciudadLabel(zone.zona);
                  const barColor = compliance >= 1 ? 'bg-emerald-500' : compliance >= 0.8 ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <ProgressRow key={i} rank={i + 1}
                      name={`Zona ${zone.zona}`}
                      sub={zone.vendedor}
                      value={zone.ventasNetas}
                      pct={compliance}
                      color={barColor}
                      textColor={compliance >= 1 ? 'text-emerald-300' : compliance >= 0.8 ? 'text-amber-300' : 'text-rose-300'}
                      badge={{ label: c.label, bg: 'bg-slate-800', text: c.color }}
                    />
                  );
                })}
              </div>
              {/* Mini scorecard lateral */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-3xl border border-blue-500/30 p-6">
                  <p className="text-blue-300 text-sm font-bold uppercase tracking-widest mb-1">Zona Líder</p>
                  <p className="text-3xl font-black text-white">{topZones[0]?.zona || 'N/A'}</p>
                  <p className="text-slate-400 text-sm mt-1">{topZones[0]?.vendedor}</p>
                  <p className="text-2xl font-extrabold text-blue-300 mt-2">{formatShortCurrency(topZones[0]?.ventasNetas)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-3xl border border-emerald-500/30 p-6">
                  <p className="text-emerald-300 text-sm font-bold uppercase tracking-widest mb-1">Zonas en Meta ✓</p>
                  <p className="text-5xl font-black text-white">
                    {filteredData.zones.filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto >= 1).length}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">de {filteredData.zones.length} zonas</p>
                </div>
                <div className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 rounded-3xl border border-rose-500/30 p-6">
                  <p className="text-rose-300 text-sm font-bold uppercase tracking-widest mb-1">Zonas Críticas ⚠️</p>
                  <p className="text-5xl font-black text-white">
                    {filteredData.zones.filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto < 0.6).length}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">por debajo del 60%</p>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 3: EJECUTIVOS ─────────────────────────────────────── */}
          {currentView === 3 && (
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-1">
                <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-2 shrink-0">
                  <Users className="h-7 w-7 text-emerald-400" /> Top Ejecutivos · Ventas
                </h2>
                {topSellers.map((seller, i) => {
                  const isAlert = seller.porcentajeDevolucion > 0.05;
                  const c = ciudadLabel(seller.ejecutivo);
                  return (
                    <ProgressRow key={i} rank={i + 1}
                      name={seller.nombre}
                      sub={`Zona ${seller.ejecutivo} · Dev: ${formatPercent(seller.porcentajeDevolucion)}`}
                      value={seller.ventas}
                      pct={seller.ventas / maxSeller}
                      color={isAlert ? 'bg-rose-500' : 'bg-emerald-500'}
                      textColor="text-white"
                      badge={{ label: c.label, bg: 'bg-slate-800', text: c.color }}
                    />
                  );
                })}
              </div>
              {/* Muro de honor */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <h2 className="text-xl font-black text-white flex items-center gap-2 shrink-0">
                  <Award className="h-6 w-6 text-amber-400" /> Muro de Honor
                </h2>
                {/* MVP */}
                <div className="bg-gradient-to-br from-amber-600/20 to-yellow-600/20 rounded-3xl border border-amber-500/30 p-6">
                  <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">🏆 MVP del Mes</p>
                  <p className="text-2xl font-black text-white">{topSellers[0]?.nombre || 'N/A'}</p>
                  <p className="text-slate-400 text-sm">{formatShortCurrency(topSellers[0]?.ventas)}</p>
                </div>
                {/* Menor devolución */}
                {(() => {
                  const best = [...filteredData.returnsSellers]
                    .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE' && s.ventas > 0)
                    .sort((a, b) => a.porcentajeDevolucion - b.porcentajeDevolucion)[0];
                  return best ? (
                    <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-3xl border border-emerald-500/30 p-6">
                      <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">✅ Menor Devolución</p>
                      <p className="text-2xl font-black text-white">{best.nombre}</p>
                      <p className="text-emerald-400 font-bold">{formatPercent(best.porcentajeDevolucion)}</p>
                    </div>
                  ) : null;
                })()}
                {/* Alertas */}
                <div className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 rounded-3xl border border-rose-500/30 p-6">
                  <p className="text-rose-300 text-xs font-bold uppercase tracking-widest mb-1">⚠️ Requieren Atención</p>
                  <p className="text-5xl font-black text-white">
                    {filteredData.returnsSellers.filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.porcentajeDevolucion > 0.05).length}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">ejecutivos con dev &gt; 5%</p>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 4: PROVEEDORES ────────────────────────────────────── */}
          {currentView === 4 && (
            <div className="grid grid-cols-2 gap-6 h-full">
              <div className="flex flex-col h-full overflow-y-auto pr-2 space-y-1">
                <h2 className="text-2xl font-black text-white mb-3 flex items-center gap-2 shrink-0">
                  <Package className="h-7 w-7 text-indigo-400" /> Portafolio Alpina · Ventas 2026
                </h2>
                {topProviders.map((prov, i) => (
                  <ProgressRow key={i} rank={i + 1}
                    name={prov.proveedor}
                    sub={prov.ventas2025 > 0 ? `2025: ${formatShortCurrency(prov.ventas2025)}` : ''}
                    value={prov.ventas2026}
                    pct={prov.ventas2026 / maxProvider}
                    color={prov.crecimiento > 0 ? 'bg-blue-500' : 'bg-rose-500'}
                    textColor="text-white"
                    badge={prov.crecimiento > 0
                      ? { label: `+${formatPercent(prov.crecimiento)}`, bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
                      : { label: formatPercent(prov.crecimiento), bg: 'bg-rose-500/10', text: 'text-rose-400' }}
                  />
                ))}
              </div>
              {/* Scorecard proveedor */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <h2 className="text-xl font-black text-white flex items-center gap-2 shrink-0">
                  <Truck className="h-6 w-6 text-blue-400" /> Resumen Portafolio
                </h2>
                <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-3xl border border-blue-500/30 p-6">
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Proveedor Estrella</p>
                  <p className="text-2xl font-black text-white">{topProviders[0]?.proveedor || 'N/A'}</p>
                  <p className="text-blue-300 font-bold mt-1">{formatShortCurrency(topProviders[0]?.ventas2026)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-3xl border border-emerald-500/30 p-6">
                  <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Crecimiento Promedio YoY</p>
                  <p className="text-5xl font-black text-emerald-400">
                    {formatPercent(filteredData.providers.length > 0
                      ? filteredData.providers.reduce((s, p) => s + p.crecimiento, 0) / filteredData.providers.length
                      : 0)}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">vs 2025</p>
                </div>
                <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 rounded-3xl border border-violet-500/30 p-6">
                  <p className="text-violet-300 text-xs font-bold uppercase tracking-widest mb-1">Referencias Activas</p>
                  <p className="text-5xl font-black text-white">{filteredData.providers.length}</p>
                  <p className="text-slate-400 text-sm mt-1">productos en portafolio</p>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA 5: ALERTAS DEL CANAL ──────────────────────────────── */}
          {currentView === 5 && (
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Alertas */}
              <div className="flex flex-col h-full overflow-y-auto pr-2">
                <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2 shrink-0">
                  <ShieldAlert className="h-7 w-7 text-rose-400" /> Alertas del Canal
                </h2>
                <div className="space-y-3">
                  {alerts.length === 0 && (
                    <div className="bg-emerald-600/10 rounded-2xl border border-emerald-500/30 p-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                      <p className="text-xl font-bold text-emerald-300">Sin alertas críticas</p>
                      <p className="text-slate-400 text-sm mt-1">Todos los indicadores dentro del rango</p>
                    </div>
                  )}
                  {alerts.map((alert, i) => {
                    const Icon = alert.icon;
                    const styles = {
                      danger:  { bg: 'bg-rose-600/10',    border: 'border-rose-500/30',    text: 'text-rose-300',    icon: 'text-rose-400'    },
                      warning: { bg: 'bg-amber-600/10',   border: 'border-amber-500/30',   text: 'text-amber-300',   icon: 'text-amber-400'   },
                      success: { bg: 'bg-emerald-600/10', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: 'text-emerald-400' },
                    }[alert.type] || {};
                    return (
                      <div key={i} className={`${styles.bg} rounded-2xl border ${styles.border} p-5 flex items-start gap-4`}>
                        <Icon className={`h-8 w-8 ${styles.icon} shrink-0 mt-0.5`} />
                        <div>
                          <h3 className={`text-xl font-bold ${styles.text}`}>{alert.title}</h3>
                          <p className="text-slate-400 text-sm mt-1">{alert.msg}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* KPIs de salud */}
              <div className="flex flex-col gap-4 h-full overflow-y-auto">
                <h2 className="text-xl font-black text-white flex items-center gap-2 shrink-0">
                  <Activity className="h-6 w-6 text-blue-400" /> Salud del Canal
                </h2>
                {[
                  { label: 'Tasa de Devolución',   value: formatPercent(devRate),                good: devRate <= 0.04,  warn: devRate <= 0.06 },
                  { label: 'Cumplimiento Meta',     value: formatPercent(kpis.compliance),        good: kpis.compliance >= 1, warn: kpis.compliance >= 0.8 },
                  { label: 'Crecimiento YoY',       value: `+${formatPercent(kpis.growth)}`,      good: kpis.growth > 0.1, warn: kpis.growth > 0 },
                  { label: 'Proyección fin de mes', value: formatShortCurrency(proyectedEOM),     good: proyEOMCompliance >= 1, warn: proyEOMCompliance >= 0.85 },
                  { label: 'Total Facturas',        value: kpis.totalFacturas.toLocaleString('es-CO'), good: true, warn: true },
                  { label: 'Ticket Promedio',       value: formatShortCurrency(kpis.averageTicket), good: true, warn: true },
                ].map((item, j) => {
                  const color = item.good ? 'text-emerald-400' : item.warn ? 'text-amber-400' : 'text-rose-400';
                  const bg    = item.good ? 'from-emerald-600/10' : item.warn ? 'from-amber-600/10' : 'from-rose-600/10';
                  const bord  = item.good ? 'border-emerald-500/20' : item.warn ? 'border-amber-500/20' : 'border-rose-500/20';
                  return (
                    <div key={j} className={`bg-gradient-to-r ${bg} to-transparent rounded-2xl border ${bord} px-6 py-4 flex items-center justify-between`}>
                      <p className="text-slate-300 font-semibold">{item.label}</p>
                      <p className={`text-2xl font-black ${color}`}>{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>{/* end content */}

        {/* ── FOOTER: barra progreso + dots ──────────────────────────────── */}
        <div className="shrink-0 mt-4">
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-none`}
              style={{ width: `${isPaused ? progress : progress}%` }} />
          </div>
          <div className="flex items-center justify-center gap-2">
            {VIEWS.map((_, i) => (
              <button key={i} onClick={() => { setCurrentView(i); setProgress(0); }}
                className={`h-2 rounded-full transition-all ${i === currentView ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'}`} />
            ))}
          </div>
        </div>

      </div>{/* end flex col */}
    </div>
  );
};

export default TVDashboard;
