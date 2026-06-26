import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency, formatNumber } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import { BarChart3, CircleDollarSign, Sparkles } from 'lucide-react';
import alpinaLogo from '../assets/alpina-logo.svg';

const FocosNumerica = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const currentWorkDay = useStore(state => state.currentWorkDay);
  const filteredData = getFilteredData(dbData, filters);

  // ── Constantes del mes — conectadas al store ────────────────────────
  const PRESUPUESTO_MES = 4001885288;
  const DIAS_HABILES    = 22; // Días hábiles reales de junio 2026

  // Día actual: usa el configurado manualmente; si es 0, detecta desde datos
  const detectedDay = useMemo(() => {
    const days = (dbData.salesDaily || [])
      .filter(d => d.fecha && d.fecha !== 'general' && !isNaN(new Date(d.fecha).getTime()));
    return days.length > 0 ? days.length : 1;
  }, [dbData.salesDaily]);

  const DIA_ACTUAL  = currentWorkDay > 0 ? currentWorkDay : detectedDay;
  const META_DIARIA = PRESUPUESTO_MES / DIAS_HABILES;
  const META_ACUMULADA = META_DIARIA * DIA_ACTUAL;

  // ── useState SIEMPRE antes de useMemo ───────────────────────────────
  const [selectedCity, setSelectedCity] = useState('ALL');

  const zoneCity = (zona) => ZONA_CIUDAD_MAP[zona] || 'OTRO';

  const numericFocus = filteredData.zones.map((z) => ({
    ...z,
    city: zoneCity(z.zona),
    coverage: z.presupuesto > 0 ? z.ventasNetas / z.presupuesto : 0,
    efficiency: z.facturas > 0 ? z.ventasNetas / z.facturas : 0,
    variance: z.porcentajeProyectado - 1
  }));

  const filteredByCity = useMemo(() => {
    if (selectedCity === 'ALL') return numericFocus;
    return numericFocus.filter((z) => z.city === selectedCity);
  }, [numericFocus, selectedCity]);

  const totalFocusFacturas = filteredByCity.reduce((sum, z) => sum + z.facturas, 0);
  const totalNetSales = filteredByCity.reduce((sum, z) => sum + z.ventasNetas, 0);
  const totalBudget = filteredByCity.reduce((sum, z) => sum + z.presupuesto, 0);
  const averageCoverage = numericFocus.length > 0
    ? numericFocus.reduce((sum, z) => sum + z.coverage, 0) / numericFocus.length
    : 0;
  const salesGap = Math.max(0, totalBudget - totalNetSales);
  const averageInvoice = totalFocusFacturas > 0 ? totalNetSales / totalFocusFacturas : 0;
  const estimatedClientsToGoal = averageInvoice > 0 ? Math.ceil(salesGap / averageInvoice) : 0;
  const zonesBelowTarget = numericFocus.filter((z) => z.coverage < 0.75).length;
  const worstZone = numericFocus.reduce((worst, z) => z.coverage < (worst?.coverage ?? Infinity) ? z : worst, null);
  const topEfficiencyZone = numericFocus.reduce((best, z) => z.efficiency > (best?.efficiency ?? -Infinity) ? z : best, null);

  const citySummary = Object.values(filteredByCity.reduce((acc, z) => {
    const key = z.city;
    if (!acc[key]) {
      acc[key] = { city: key, presupuesto: 0, ventasNetas: 0, facturas: 0 };
    }
    acc[key].presupuesto += z.presupuesto;
    acc[key].ventasNetas += z.ventasNetas;
    acc[key].facturas += z.facturas;
    return acc;
  }, {})).map((city) => ({
    ...city,
    coverage: city.presupuesto > 0 ? city.ventasNetas / city.presupuesto : 0,
    facturasShare: totalFocusFacturas > 0 ? city.facturas / totalFocusFacturas : 0
  }));

  const cityClients = dbData.cityClients || {
    'ARMENIA': 3072,
    'MANIZALES': 3767,
    'PEREIRA': 8355
  };

  const cityGoalData = [
    { city: 'ARMENIA', universeClients: 8885, metaClients: 4354, impactedClients: cityClients['ARMENIA'] || 0 },
    { city: 'MANIZALES', universeClients: 10555, metaClients: 5172, impactedClients: cityClients['MANIZALES'] || 0 },
    { city: 'PEREIRA', universeClients: 19825, metaClients: 9714, impactedClients: cityClients['PEREIRA'] || 0 }
  ].map((item) => ({
    ...item,
    numericalCoverage: item.metaClients > 0 ? item.impactedClients / item.metaClients : 0,
    clientsMissing: Math.max(0, item.metaClients - item.impactedClients)
  }));

  const goalTotals = cityGoalData.reduce((acc, item) => ({
    universeClients: acc.universeClients + item.universeClients,
    metaClients: acc.metaClients + item.metaClients,
    impactedClients: acc.impactedClients + item.impactedClients
  }), { universeClients: 0, metaClients: 0, impactedClients: 0 });

  const coverageSeries = [{
    name: 'Cobertura %',
    data: filteredByCity.map((z) => Math.round(z.coverage * 100))
  }];

  const coverageOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#38bdf8'],
    plotOptions: { bar: { borderRadius: 10, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: filteredByCity.map((z) => z.zona), labels: { rotate: -30, style: { fontSize: '10px' }, hideOverlappingLabels: true } },
    yaxis: { labels: { formatter: (val) => `${Math.round(val)}%` }, min: 0, max: 140 },
    tooltip: { theme: 'dark', y: { formatter: (val) => `${Math.round(val)}%` } },
    grid: { borderColor: '#1e293b' }
  };

  const efficiencySeries = [{
    name: 'Eficiencia',
    data: citySummary.map((c) => Math.round(c.ventasNetas / (c.facturas || 1)))
  }];

  const efficiencyOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#f59e0b'],
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4, colors: ['#f59e0b'] },
    dataLabels: { enabled: false },
    xaxis: { categories: citySummary.map((c) => c.city), labels: { style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: (val) => formatShortCurrency(val) } },
    tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
    grid: { borderColor: '#1e293b' }
  };

  // Build a simple linear forecast for sales using salesDaily
  const salesTimeseries = useMemo(() => {
    const rows = (dbData.salesDaily || []).map((r) => ({
      date: new Date(r.fecha),
      total: r.total
    })).sort((a, b) => a.date - b.date);

    if (rows.length < 3) return { actual: rows.map(r => ({ x: r.date.toISOString().slice(0,10), y: r.total })), forecast: [] };

    // simple linear regression on index -> total
    const xs = rows.map((_, i) => i);
    const ys = rows.map(r => r.total);
    const n = xs.length;
    const sumX = xs.reduce((a,b) => a+b,0);
    const sumY = ys.reduce((a,b) => a+b,0);
    const sumXY = xs.reduce((s, xi, i) => s + xi * ys[i], 0);
    const sumXX = xs.reduce((s, xi) => s + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const actual = rows.map((r, i) => ({ x: r.date.toISOString().slice(0,10), y: r.total }));
    const forecast = [];
    const lastIndex = xs.length - 1;
    for (let k = 1; k <= 7; k++) {
      const idx = lastIndex + k;
      const date = new Date(rows[rows.length - 1].date);
      date.setDate(date.getDate() + k);
      const predicted = intercept + slope * idx;
      forecast.push({ x: date.toISOString().slice(0,10), y: Math.max(0, Math.round(predicted)) });
    }

    return { actual, forecast };
  }, [dbData.salesDaily]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-950/70 border border-slate-800 px-4 py-2 shadow-lg shadow-slate-950/20">
            <img src={alpinaLogo} alt="Alpina" className="h-9 w-auto" loading="lazy" />
            <span className="text-slate-300 text-sm uppercase tracking-[0.25em]">Focos Numérica</span>
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-white">Inteligencia numérica Alpina</h1>
            <p className="text-slate-300 text-sm mt-1">
              Panel exclusivo de análisis de focos, cobertura y eficiencia por zona. Todo el insight financiero y operativo en un solo lugar.
            </p>
            <div className="mt-3">
              <label className="text-xs text-slate-400 mr-2">Filtrar ciudad:</label>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-slate-900 text-slate-200 text-sm rounded px-2 py-1 border border-slate-800">
                <option value="ALL">Todas</option>
                <option value="ARMENIA">ARMENIA</option>
                <option value="MANIZALES">MANIZALES</option>
                <option value="PEREIRA">PEREIRA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
          </div>
        </div>

        <GlassCard hoverable={false} className="bg-slate-950/70 border border-sky-500/20 p-5 shadow-[0_25px_80px_-45px_rgba(56,189,248,0.6)]">
          {/* Banner de avance del mes */}
          <div className="mb-4 pb-4 border-b border-slate-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Avance Junio 2026 · Día hábil {DIA_ACTUAL} de {DIAS_HABILES}</p>
                <p className="text-xl font-extrabold text-white mt-1">
                  Meta acumulada al día {DIA_ACTUAL}: <span className="text-sky-300">{formatCurrency(META_ACUMULADA)}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Presupuesto total mes: <span className="text-slate-200 font-semibold">{formatCurrency(PRESUPUESTO_MES)}</span>
                  &nbsp;·&nbsp; Meta diaria: <span className="text-slate-200 font-semibold">{formatCurrency(META_DIARIA)}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Progreso del mes</span>
                  <span className="text-sm font-bold text-sky-400">{DIA_ACTUAL}/{DIAS_HABILES} días</span>
                </div>
                <div className="w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
                    style={{ width: `${(DIA_ACTUAL / DIAS_HABILES) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{Math.round((DIA_ACTUAL / DIAS_HABILES) * 100)}% del mes transcurrido</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                  Esta sección destaca las zonas más críticas y las oportunidades de eficiencia con datos Alpina 100% filtrados. Faltan {formatNumber(estimatedClientsToGoal)} clientes de ticket promedio para cerrar la meta de presupuesto.
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-950/60 border border-slate-800 p-4 flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-amber-300" />
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Facturas de foco</p>
                <p className="text-2xl font-bold text-white mt-1">{formatNumber(totalFocusFacturas)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Cobertura promedio</p>
            <p className="text-2xl font-bold text-white mt-2">{formatPercent(averageCoverage)}</p>
            <p className="text-slate-500 text-[10px] mt-2">Porcentaje medio de ejecución de presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Clientes faltantes</p>
            <p className="text-2xl font-bold text-white mt-2">{formatNumber(estimatedClientsToGoal)}</p>
            <p className="text-slate-500 text-[10px] mt-2">Estimado con ticket promedio actual</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Brecha comercial</p>
            <p className="text-2xl font-bold text-white mt-2">{formatCurrency(salesGap)}</p>
            <p className="text-slate-500 text-[10px] mt-2">Ventas netas faltantes para cerrar el presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Zonas en alerta</p>
            <p className="text-2xl font-bold text-white mt-2">{zonesBelowTarget}</p>
            <p className="text-slate-500 text-[10px] mt-2">Zonas con cobertura menor al 75%</p>
          </GlassCard>
        </div>

        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Cumplimiento por ciudad</h3>
              <p className="text-xs text-slate-400 mt-1">Universo de clientes, meta numérica y faltantes por ciudad.</p>
            </div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Total general {formatPercent(goalTotals.impactedClients / goalTotals.metaClients)}</span>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[400px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-[0.12em] text-[10px]">
                  <th className="pb-3 pr-4">Ciudad</th>
                  <th className="pb-3 pr-4 hidden sm:table-cell">Universo</th>
                  <th className="pb-3 pr-4">Meta</th>
                  <th className="pb-3 pr-4">Impactados</th>
                  <th className="pb-3 pr-4">Cobertura</th>
                  <th className="pb-3 pr-2">Faltan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {cityGoalData.map((city) => (
                  <tr key={city.city} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-300 font-semibold">{city.city}</td>
                    <td className="py-2.5 pr-4 text-slate-400 hidden sm:table-cell">{formatNumber(city.universeClients)}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatNumber(city.metaClients)}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatNumber(city.impactedClients)}</td>
                    <td className="py-2.5 pr-4 font-bold text-slate-100">{formatPercent(city.numericalCoverage)}</td>
                    <td className="py-2.5 pr-2 text-slate-100">{formatNumber(city.clientsMissing)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900/40">
                  <td className="py-3 pr-4 text-slate-200 font-semibold">Total</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(goalTotals.universeClients)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(goalTotals.metaClients)}</td>
                  <td className="py-3 pr-4 text-slate-200">{formatNumber(goalTotals.impactedClients)}</td>
                  <td className="py-3 pr-4 text-slate-100">{formatPercent(goalTotals.impactedClients / goalTotals.metaClients)}</td>
                  <td className="py-3 pr-2 text-slate-100">{formatNumber(goalTotals.metaClients - goalTotals.impactedClients)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Cobertura por zona</h3>
              <p className="text-xs text-slate-400 mt-1">Análisis de riesgo presupuestal por zona.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-sky-400" />
          </div>
          <Chart options={coverageOptions} series={coverageSeries} type="bar" height={320} />
        </GlassCard>

        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Eficiencia por ciudad</h3>
              <p className="text-xs text-slate-400 mt-1">Costo por factura y rendimiento operativo.</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <Chart options={efficiencyOptions} series={efficiencySeries} type="line" height={320} />
        </GlassCard>
      </div>

      <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Ventas diarias y pronóstico</h3>
            <p className="text-xs text-slate-400 mt-1">Series histórica y predicción lineal simple (7 días).</p>
          </div>
        </div>
        <Chart
          options={{
            chart: {
              id: 'sales-forecast',
              background: 'transparent',
              toolbar: { show: false },
              animations: { enabled: false },
              fontFamily: 'Inter, sans-serif'
            },
            xaxis: { type: 'category', labels: { style: { colors: '#94a3b8', fontSize: '10px' } } },
            yaxis: { labels: { style: { colors: '#94a3b8' }, formatter: v => formatShortCurrency(v) } },
            stroke: { curve: 'smooth', width: [2, 2] },
            tooltip: { theme: 'dark' },
            colors: ['#60a5fa', '#34d399'],
            grid: { borderColor: '#1e293b', strokeDashArray: 4 },
            legend: { position: 'top', labels: { colors: '#94a3b8' } },
            noData: { text: 'Sin datos', style: { color: '#475569' } }
          }}
          series={[
            { name: 'Actual', data: salesTimeseries.actual },
            { name: 'Pronóstico', data: salesTimeseries.forecast }
          ]}
          type="line"
          height={320}
        />
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard hoverable={false} className="lg:col-span-1 bg-slate-950/85 border border-slate-800/70 p-5">
          <h4 className="text-sm font-bold text-white mb-4">Top zonas de atención</h4>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Zona más crítica</p>
              <p className="text-xl font-bold text-white mt-2">{worstZone?.zona || 'N/A'}</p>
              <p className="text-slate-500 text-[10px] mt-2">{worstZone ? `${worstZone.city} · ${formatPercent(worstZone.coverage)} cobertura` : 'Sin datos disponibles'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Zona más eficiente</p>
              <p className="text-xl font-bold text-white mt-2">{topEfficiencyZone?.zona || 'N/A'}</p>
              <p className="text-slate-500 text-[10px] mt-2">{topEfficiencyZone ? `${topEfficiencyZone.city} · ${formatShortCurrency(topEfficiencyZone.efficiency)}/factura` : ''}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="lg:col-span-2 bg-slate-950/85 border border-slate-800/70 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-white">Resumen por ciudad</h4>
              <p className="text-xs text-slate-400 mt-1">Comparativa de cobertura y carga de facturas Alpina.</p>
            </div>
          </div>
          <div className="space-y-3">
            {citySummary.map((city) => (
              <div key={city.city} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-300 text-sm font-semibold">{city.city}</p>
                  <p className="text-slate-100 text-sm font-semibold">{formatPercent(city.coverage)}</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">{formatNumber(city.facturas)} facturas · {formatPercent(city.facturasShare)} del total</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default FocosNumerica;
