import React from 'react';
import Chart from 'react-apexcharts';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { formatCurrency, formatPercent, formatShortCurrency } from '../../utils/formatters';

// Common ApexCharts configuration options for light theme
const baseApexOptions = {
  theme: {
    mode: 'light',
    palette: 'palette1'
  },
  chart: {
    background: 'transparent',
    foreColor: '#475569',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    // Desactivar animaciones previene errores al desmontar componentes
    animations: {
      enabled: false
    },
    redrawOnParentResize: true,
    redrawOnWindowResize: true
  },
  grid: {
    borderColor: '#e2e8f0',
    strokeDashArray: 4
  },
  tooltip: {
    theme: 'light',
    x: { show: true }
  },
  noData: {
    text: 'Sin datos',
    style: { color: '#94a3b8', fontSize: '13px' }
  }
};

// 1. LINE CHART — Barras diarias (verde/rojo vs meta) + tendencia + pronóstico
export const BILineChart = ({ data = [], metaDiaria = 0 }) => {
  if (!data || data.length === 0) return (
    <div className="h-[300px] flex items-center justify-center text-slate-600 text-sm">Sin datos de ventas diarias</div>
  );

  const historial  = data.filter(d => d.type !== 'pronostico');
  const pronostico = data.filter(d => d.type === 'pronostico');
  const n = historial.length;

  // Promedio móvil 3 días sobre historial
  const tendencia = historial.map((_, i) => {
    const slice = historial.slice(Math.max(0, i - 2), i + 1);
    return Math.round(slice.reduce((s, d) => s + (d.total || 0), 0) / slice.length);
  });

  const categories = data.map(d => d.fecha);

  // Serie 1: barras historial — null en días de pronóstico
  const barData = [
    ...historial.map(d => Math.round(d.total || 0)),
    ...pronostico.map(() => null)
  ];

  // Serie 2: tendencia — null en días de pronóstico
  const tendenciaData = [
    ...tendencia,
    ...pronostico.map(() => null)
  ];

  // Serie 3: pronóstico — null en historial excepto el último punto de conexión
  const pronosticoData = [
    ...historial.map((d, i) => i === n - 1 ? Math.round(d.total || 0) : null),
    ...pronostico.map(d => Math.round(d.total || 0))
  ];

  const series = [
    { name: 'Venta del día', type: 'bar',  data: barData        },
    { name: 'Tendencia',     type: 'line', data: tendenciaData  },
    { name: 'Pronóstico',    type: 'line', data: pronosticoData }
  ];

  const yAnnotations = metaDiaria > 0 ? [{
    y: Math.round(metaDiaria),
    borderColor: '#d97706',
    strokeDashArray: 5,
    borderWidth: 1.5,
    label: {
      text: `Meta/día ${formatShortCurrency(metaDiaria)}`,
      style: { color: '#d97706', background: '#ffffff', fontSize: '9px', fontWeight: 700 },
      position: 'right', offsetX: -8, offsetY: -4
    }
  }] : [];

  const xAnnotations = pronostico.length > 0 && n > 0 ? [{
    x: historial[n - 1]?.fecha,
    borderColor: '#94a3b8',
    strokeDashArray: 4,
    label: {
      text: 'Hoy',
      style: { color: '#475569', background: '#ffffff', fontSize: '9px', fontWeight: 600 },
      orientation: 'horizontal', offsetY: -6
    }
  }] : [];

  const options = {
    ...baseApexOptions,
    chart: { ...baseApexOptions.chart, type: 'line', animations: { enabled: false } },
    colors: ['#0284c7', '#6366f1', '#d97706'],
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%' } },
    stroke: { curve: 'smooth', width: [0, 2.5, 2], dashArray: [0, 0, 6] },
    fill: { type: ['solid', 'solid', 'solid'] },
    markers: { size: [0, 0, 4], colors: ['#0284c7', '#6366f1', '#d97706'], strokeColors: '#ffffff', strokeWidth: 2 },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { rotate: -45, style: { fontSize: '9px', colors: '#64748b' }, hideOverlappingLabels: true },
      axisBorder: { show: false }, axisTicks: { show: false }
    },
    yaxis: { labels: { formatter: v => formatShortCurrency(v), style: { colors: '#64748b' } } },
    legend: {
      show: true, position: 'top', horizontalAlign: 'left', fontSize: '11px',
      labels: { colors: '#475569' },
      markers: { width: 10, height: 10, radius: 2 }
    },
    annotations: { xaxis: xAnnotations, yaxis: yAnnotations },
    tooltip: {
      theme: 'light', shared: true, intersect: false,
      y: { formatter: v => v != null ? formatCurrency(v) : '—' }
    }
  };

  return <Chart options={options} series={series} type="line" height={300} />;
};

// 2. AVANCE VS META — Gauge velocímetro + semáforo de proyección
export const BIAreaChart = ({ data = [], presupuesto = 0, diasHabiles = 23, workDay = 0, ventaNeta = 0 }) => {
  if (!data || data.length === 0) return (
    <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm">Sin datos de ventas diarias</div>
  );

  const diasTranscurridos = workDay > 0 ? workDay : data.length;

  // Usar ventaNeta (ventas netas reales) si viene, si no acumular el bruto del salesDaily
  const ventaAcumulada = ventaNeta > 0
    ? ventaNeta
    : data.reduce((s, d) => s + (d.total || 0), 0);

  // Meta acumulada proporcional a días transcurridos
  const metaDiaria   = presupuesto > 0 && diasHabiles > 0 ? presupuesto / diasHabiles : 0;
  const metaAcumulada = metaDiaria * diasTranscurridos;

  // % ejecutado = venta neta / meta proporcional al día actual
  const pctEjecutado  = metaAcumulada > 0 ? (ventaAcumulada / metaAcumulada) * 100 : 0;

  // Proyección cierre = ritmo neto actual × días hábiles totales
  const proyeccionCierre = diasTranscurridos > 0 ? (ventaAcumulada / diasTranscurridos) * diasHabiles : 0;
  const pctProyeccion    = presupuesto > 0 ? (proyeccionCierre / presupuesto) * 100 : 0;

  const brecha    = ventaAcumulada - metaAcumulada;
  const estaArriba = brecha >= 0;

  const color     = pctEjecutado >= 100 ? '#10b981' : pctEjecutado >= 85 ? '#f59e0b' : '#ef4444';
  const colorProy = pctProyeccion >= 100 ? '#10b981' : pctProyeccion >= 90 ? '#f59e0b' : '#ef4444';

  // % cumplimiento real = venta neta / presupuesto TOTAL del mes (sin proporcionar por días)
  const pctCumplReal = presupuesto > 0 ? (ventaAcumulada / presupuesto) * 100 : 0;
  const colorReal    = pctCumplReal >= 100 ? '#10b981' : pctCumplReal >= 85 ? '#f59e0b' : '#ef4444';
  const colorRealGrad = colorReal === '#10b981' ? '#34d399' : colorReal === '#f59e0b' ? '#fcd34d' : '#f87171';
  const colorGrad = color === '#10b981' ? '#34d399' : color === '#f59e0b' ? '#fcd34d' : '#f87171';

  // Semáforo de proyección: ícono + estado + frase
  const proyEstado = pctProyeccion >= 100
    ? { icono: '🟢', titulo: 'Cierre en verde', frase: 'Al ritmo actual cierras sobre presupuesto', bg: '#10b98112', border: '#10b98135' }
    : pctProyeccion >= 90
    ? { icono: '🟡', titulo: 'Cierre ajustado', frase: 'Necesitas acelerar para llegar al 100%', bg: '#f59e0b12', border: '#f59e0b35' }
    : pctProyeccion >= 75
    ? { icono: '🔴', titulo: 'Cierre en riesgo', frase: 'El ritmo actual no alcanza el presupuesto', bg: '#ef444412', border: '#ef444435' }
    : { icono: '🚨', titulo: 'Brecha crítica', frase: 'Requiere intervención comercial urgente', bg: '#ef444420', border: '#ef444450' };

  // SVG Gauge helper parameters
  const r = 52;
  const circ = 2 * Math.PI * r; // ~326.7
  const arcLen = circ * 0.75; // 270 deg = 245.0
  const off1 = arcLen - (arcLen * Math.min(pctEjecutado, 100)) / 100;
  const off2 = arcLen - (arcLen * Math.min(pctCumplReal, 100)) / 100;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Fila de gauges ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Gauge 1 — avance vs meta acumulada proporcional */}
        <div className="relative flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-xs">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none"
            style={{ background: color }} />

          <div className="relative w-36 h-32 flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 130 130" className="transform rotate-[135deg]">
              <defs>
                <linearGradient id="gaugeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={color} />
                  <stop offset="100%" stopColor={colorGrad} />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r={r} fill="none" stroke="#e2e8f0" strokeWidth="13"
                strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round" />
              <circle cx="65" cy="65" r={r} fill="none" stroke="url(#gaugeGrad1)" strokeWidth="13"
                strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={off1} strokeLinecap="round"
                className="transition-all duration-700 ease-out" />
            </svg>

            {/* Texto central perfectamente posicionado */}
            <div className="absolute inset-0 pb-3 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black tracking-tight" style={{ color }}>
                {pctEjecutado.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                vs Meta acumulada
              </span>
            </div>
          </div>

          <div className="text-center -mt-2">
            <p className="text-[11px] font-extrabold" style={{ color }}>
              {estaArriba ? `▲ +${formatShortCurrency(brecha)}` : `▼ ${formatShortCurrency(Math.abs(brecha))}`}
            </p>
            <p className="text-[9px] text-slate-500 font-medium">vs meta día {diasTranscurridos}</p>
          </div>
        </div>

        {/* Gauge 2 — cumplimiento real venta neta / presupuesto total */}
        <div className="relative flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-xs">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none"
            style={{ background: colorReal }} />

          <div className="relative w-36 h-32 flex items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 130 130" className="transform rotate-[135deg]">
              <defs>
                <linearGradient id="gaugeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colorReal} />
                  <stop offset="100%" stopColor={colorRealGrad} />
                </linearGradient>
              </defs>
              <circle cx="65" cy="65" r={r} fill="none" stroke="#e2e8f0" strokeWidth="13"
                strokeDasharray={`${arcLen} ${circ}`} strokeLinecap="round" />
              <circle cx="65" cy="65" r={r} fill="none" stroke="url(#gaugeGrad2)" strokeWidth="13"
                strokeDasharray={`${arcLen} ${circ}`} strokeDashoffset={off2} strokeLinecap="round"
                className="transition-all duration-700 ease-out" />
            </svg>

            {/* Texto central perfectamente posicionado */}
            <div className="absolute inset-0 pb-3 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black tracking-tight" style={{ color: colorReal }}>
                {pctCumplReal.toFixed(1)}%
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                del presupuesto
              </span>
            </div>
          </div>

          <div className="text-center -mt-2">
            <p className="text-[11px] font-extrabold" style={{ color: colorReal }}>
              {formatShortCurrency(ventaAcumulada)}
            </p>
            <p className="text-[9px] text-slate-500 font-medium">venta neta real</p>
          </div>
        </div>
      </div>

      {/* ── Fila inferior: semáforo + días ── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Semáforo de proyección */}
        <div className="rounded-xl p-2.5 border relative overflow-hidden shadow-xs"
          style={{ background: proyEstado.bg, borderColor: proyEstado.border }}>
          <div className="flex items-start gap-2">
            <span className="text-xl leading-none mt-0.5">{proyEstado.icono}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-900 leading-tight">{proyEstado.titulo}</p>
              <p className="text-[9px] text-slate-600 mt-0.5 leading-snug font-medium">{proyEstado.frase}</p>
              <div className="mt-1.5 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pctProyeccion, 100)}%`, background: colorProy }} />
              </div>
              <p className="text-[9px] font-bold mt-0.5" style={{ color: colorProy }}>
                {pctProyeccion.toFixed(1)}% proy. cierre
              </p>
            </div>
          </div>
        </div>

        {/* Segmentos de días hábiles */}
        <div className="rounded-xl p-2.5 border border-slate-200/80 bg-white/70 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">Días hábiles</p>
            <span className="text-sm font-black text-slate-900">{diasTranscurridos}
              <span className="text-slate-600 font-medium text-[9px]"> / {diasHabiles}</span>
            </span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: diasHabiles }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-sm"
                style={{ background: i < diasTranscurridos ? '#0284c7' : '#e2e8f0', opacity: i < diasTranscurridos ? 1 : 0.6 }} />
            ))}
          </div>
          <p className="text-[9px] text-slate-600 font-medium mt-1 text-right">
            {Math.round((diasTranscurridos / diasHabiles) * 100)}% del mes
          </p>
        </div>

      </div>
    </div>
  );
};

// 3. STACKED BAR CHART - Cash vs Credit Sales
export const BIStackedBarChart = ({ data = [] }) => {
  if (!data || data.length === 0) return (
    <div className="h-[320px] flex items-center justify-center text-slate-600 text-sm">Sin datos</div>
  );
  const normalizedData = data.map(item => ({
    ...item,
    contado: Number.isFinite(item.contado) ? item.contado : 0,
    credito: Number.isFinite(item.credito) ? item.credito : 0
  }));

  const series = [
    { name: 'Contado', data: normalizedData.map(item => item.contado) },
    { name: 'Crédito', data: normalizedData.map(item => item.credito) }
  ];

  const options = {
    ...baseApexOptions,
    chart: {
      ...baseApexOptions.chart,
      stacked: false,
    },
    colors: ['#10b981', '#f59e0b'], // emerald-500 (contado), amber-500 (credito)
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '45%',
        horizontal: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: normalizedData.map(item => item.fecha),
      labels: {
        rotate: -40,
        style: { fontSize: '9px' },
        hideOverlappingLabels: true,
        trim: true,
        maxHeight: 60
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatShortCurrency(val)
      }
    },
    tooltip: {
      ...baseApexOptions.tooltip,
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => formatCurrency(val)
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      offsetY: 0
    }
  };

  return <Chart options={options} series={series} type="bar" height={320} />;
};

// 4. DONUT CHART - Provider sales participation
// (Defined below as BIDonutChart with height parameter)

// 6. TREEMAP CHART - Provider Sales distribution (using ECharts)
export const BITreemapChart = ({ data = [] }) => {
  const treeData = data.map(item => ({
    name: item.proveedor,
    value: item.ventas2026,
    children: [
      { name: 'Ventas 2026', value: item.ventas2026 },
      { name: 'Proyectado 2026', value: item.proyectado2026 }
    ]
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (info) => {
        const value = info.value;
        const treePathInfo = info.treePathInfo;
        const name = treePathInfo[treePathInfo.length - 1].name;
        return `${name}: ${formatCurrency(value)}`;
      }
    },
    series: [
      {
        name: 'Proveedores',
        type: 'treemap',
        visibleMin: 300,
        label: {
          show: true,
          formatter: '{b}'
        },
        upperLabel: {
          show: true,
          height: 30,
          color: '#0f172a',
          backgroundColor: '#f1f5f9'
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 2
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              borderColor: '#ffffff',
              gapWidth: 3
            }
          },
          {
            color: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'],
            colorMappingBy: 'value',
            itemStyle: {
              gapWidth: 1
            }
          }
        ],
        data: treeData
      }
    ]
  };

  return <ReactECharts option={option} notMerge={true} lazyUpdate={true} style={{ height: '320px', width: '100%' }} />;
};

// 5. HEATMAP CHART - Returns by concept & seller (using ECharts)
export const BIHeatmapChart = ({ returnsSellers = [], clientReturns = [] }) => {
  const [hoveredSeller, setHoveredSeller] = React.useState(null);
  if (!returnsSellers?.length || !clientReturns?.length) return null;

  const CONCEPTS = ['INCOMPLETO', 'SEPARADO', 'ESTADO', 'EXTRARUTA', 'ERROR DEL VENDEDOR', 'BODEGA', 'CERRADO', 'SIN PLATA'];
  const CONCEPT_COLORS = {
    'INCOMPLETO':        { bg: '#3b82f6', text: '#93c5fd' },
    'SEPARADO':          { bg: '#8b5cf6', text: '#c4b5fd' },
    'ESTADO':            { bg: '#06b6d4', text: '#67e8f9' },
    'EXTRARUTA':         { bg: '#f59e0b', text: '#fcd34d' },
    'ERROR DEL VENDEDOR':{ bg: '#ef4444', text: '#fca5a5' },
    'BODEGA':            { bg: '#10b981', text: '#6ee7b7' },
    'CERRADO':           { bg: '#f97316', text: '#fdba74' },
    'SIN PLATA':         { bg: '#ec4899', text: '#f9a8d4' },
  };

  // Aggregate per seller
  const sellers = returnsSellers.slice(0, 8).map(s => {
    const sellerCode = s.ejecutivo;
    const conceptBreakdown = {};
    let total = 0;
    CONCEPTS.forEach(concept => {
      const val = clientReturns
        .filter(c => c.ejecutivo === sellerCode && c.concepto?.toUpperCase().includes(concept))
        .reduce((sum, c) => sum + c.valor, 0);
      if (val > 0) { conceptBreakdown[concept] = val; total += val; }
    });
    // Include uncategorised
    const categorised = Object.values(conceptBreakdown).reduce((a, b) => a + b, 0);
    const raw = clientReturns.filter(c => c.ejecutivo === sellerCode).reduce((sum, c) => sum + c.valor, 0);
    const other = raw - categorised;
    if (other > 100) { conceptBreakdown['OTROS'] = other; total += other; }
    return { nombre: s.nombre, total, conceptBreakdown };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  if (!sellers.length) return null;

  const maxTotal = sellers[0]?.total || 1;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {CONCEPTS.map(c => (
          <span key={c} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: CONCEPT_COLORS[c]?.text || '#94a3b8' }}>
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CONCEPT_COLORS[c]?.bg || '#94a3b8' }} />
            {c}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sellers.map((seller, idx) => {
        const barWidth = (seller.total / maxTotal) * 100;
        const isHovered = hoveredSeller === idx;
        const segments = Object.entries(seller.conceptBreakdown).sort((a, b) => b[1] - a[1]);

        return (
          <div
            key={idx}
            className="rounded-xl border transition-all duration-200 cursor-default shadow-xs"
            style={{
              background: isHovered ? 'rgba(241,245,249,0.95)' : 'rgba(255,255,255,0.85)',
              borderColor: isHovered ? 'rgba(99,102,241,0.4)' : 'rgba(226,232,240,0.9)',
            }}
            onMouseEnter={() => setHoveredSeller(idx)}
            onMouseLeave={() => setHoveredSeller(null)}
          >
            <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3">
              {/* Rank + Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-black w-5 text-center flex-shrink-0" style={{ color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#b45309' : '#94a3b8' }}>
                  #{idx + 1}
                </span>
                <p className="text-xs font-bold text-slate-900 truncate">{seller.nombre}</p>
              </div>
              {/* Total */}
              <span className="text-sm font-black text-rose-600 flex-shrink-0">
                {formatShortCurrency(seller.total)}
              </span>
            </div>

            {/* Stacked bar */}
            <div className="px-4 pb-1 mt-1">
              <div className="w-full h-4 rounded-lg overflow-hidden bg-slate-100 flex" style={{ width: '100%' }}>
                {segments.map(([concept, val], sIdx) => {
                  const segWidth = (val / seller.total) * barWidth;
                  const color = concept === 'OTROS'
                    ? '#64748b'
                    : (CONCEPT_COLORS[concept]?.bg || '#64748b');
                  return (
                    <div
                      key={sIdx}
                      className="h-full transition-all duration-300 relative group/seg"
                      style={{ width: `${segWidth}%`, background: color, minWidth: segWidth > 0.5 ? '3px' : '0px' }}
                      title={`${concept}: ${formatShortCurrency(val)}`}
                    />
                  );
                })}
                {/* Grey remainder */}
                <div className="flex-1 h-full bg-slate-200/60" />
              </div>
            </div>

            {/* Concept pills — only on hover */}
            {isHovered && (
              <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
                {segments.map(([concept, val]) => {
                  const color = concept === 'OTROS' ? '#64748b' : (CONCEPT_COLORS[concept]?.bg || '#64748b');
                  return (
                    <span
                      key={concept}
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-white shadow-xs text-slate-800"
                      style={{ borderColor: `${color}60` }}
                    >
                      {concept}: {formatShortCurrency(val)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


// 7. GAUGE CHART - Compliance indicator
export const BIGaugeChart = ({ val = 0 }) => {
  const percentage = Math.min(Math.round((val || 0) * 100), 200);
  const series = [percentage];

  const options = {
    ...baseApexOptions,
    colors: [percentage >= 100 ? '#10b981' : '#3b82f6'],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        dataLabels: {
          name: {
            fontSize: '14px',
            color: '#64748b',
            offsetY: 80,
            show: true,
            label: 'Cumplimiento'
          },
          value: {
            offsetY: 35,
            fontSize: '32px',
            color: '#0f172a',
            fontWeight: 'bold',
            formatter: (val) => `${val}%`
          }
        }
      }
    },
    stroke: { dashArray: 4 }
  };

  return <Chart options={options} series={series} type="radialBar" height={320} />;
};

// 8. WATERFALL CHART - Sales to Net Sales bridge (using ECharts)
export const BIWaterfallChart = ({ sales = 0, returns = 0 }) => {
  const netSales = sales - returns;
  const devRate  = sales > 0 ? ((returns / sales) * 100).toFixed(1) : '0.0';
  const netRate  = sales > 0 ? ((netSales / sales) * 100).toFixed(1) : '0.0';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#0f172a', fontSize: 12 },
      formatter: (params) => {
        const tar = params.find(p => p.seriesName === 'Valor') || params[0];
        if (!tar) return '';
        const icons = { 'Ventas Brutas': '📦', 'Devoluciones': '↩️', 'Ventas Netas': '✅' };
        return `<div style="font-size:12px;line-height:2;padding:4px 8px">
          <b>${icons[tar.name] || ''} ${tar.name}</b><br/>
          <span style="font-size:14px;font-weight:800;color:${tar.color}">${formatCurrency(tar.value)}</span>
        </div>`;
      }
    },
    grid: { left: '12%', right: '4%', top: '14%', bottom: '18%' },
    xAxis: {
      type: 'category',
      splitLine: { show: false },
      data: ['Ventas Brutas', 'Devoluciones', 'Ventas Netas'],
      axisLabel: { color: '#475569', fontSize: 11, fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        formatter: (val) => formatShortCurrency(val)
      },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [
      {
        name: 'Placeholder',
        type: 'bar',
        stack: 'Total',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
        data: [0, netSales, 0]
      },
      {
        name: 'Valor',
        type: 'bar',
        stack: 'Total',
        barMaxWidth: 72,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        label: {
          show: true,
          position: 'inside',
          fontSize: 12,
          fontWeight: 700,
          color: '#ffffff',
          formatter: (params) => formatShortCurrency(params.value)
        },
        data: [
          {
            value: sales,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#2563eb' }
              ]),
              borderRadius: [8, 8, 0, 0]
            }
          },
          {
            value: returns,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#fca5a5' },
                { offset: 1, color: '#dc2626' }
              ]),
              borderRadius: [8, 8, 0, 0]
            }
          },
          {
            value: netSales,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#6ee7b7' },
                { offset: 1, color: '#059669' }
              ]),
              borderRadius: [8, 8, 0, 0]
            }
          }
        ]
      }
    ],
    graphic: [
      {
        type: 'text',
        left: '27%',
        top: '4%',
        style: {
          text: `↩ ${devRate}% devuelto`,
          fill: '#dc2626',
          fontSize: 10,
          fontWeight: 700
        }
      },
      {
        type: 'text',
        right: '8%',
        top: '4%',
        style: {
          text: `✓ ${netRate}% retenido`,
          fill: '#059669',
          fontSize: 10,
          fontWeight: 700
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

// 9. RADAR CHART - Seller KPI distribution
export const BIRadarChart = ({ returnsSellers = [] }) => {
  const topSellers = returnsSellers.slice(0, 5);
  const series = topSellers.map(s => ({
    name: s.nombre,
    data: [
      Math.round(s.ventas / 1_000_000),             // Ventas en Millones
      Math.round((s.devoluciones / 100_000)),       // Devoluciones en cientos de miles
      Math.round((1 - s.porcentajeDevolucion) * 100) // Calidad (100 - %Dev)
    ]
  }));

  const options = {
    ...baseApexOptions,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
    chart: {
      ...baseApexOptions.chart,
      dropShadow: { enabled: true, blur: 1, left: 1, top: 1 }
    },
    labels: ['Ventas (M)', 'Entregas ($100K)', 'Calidad %'],
    stroke: { width: 2 },
    fill: { opacity: 0.1 },
    legend: { position: 'bottom' }
  };

  return <Chart options={options} series={series} type="radar" height={320} />;
};

// 10. SCATTER PLOT - Volume vs Returns % per client
export const BIScatterPlot = ({ clientReturns = [] }) => {
  // Aggregate returns by client
  const clientAgg = {};
  clientReturns.forEach(c => {
    if (!clientAgg[c.cliente]) {
      clientAgg[c.cliente] = { name: c.cliente, totalReturn: 0, count: 0 };
    }
    clientAgg[c.cliente].totalReturn += c.valor;
    clientAgg[c.cliente].count += 1;
  });

  const scatterData = Object.values(clientAgg)
    .slice(0, 40) // Take top 40 clients
    .map(c => [
      c.count * 120_000 + Math.random() * 50_000, // Estimated sales volume
      parseFloat((c.totalReturn / (c.count * 120_000) * 100).toFixed(2)) // Estimated return rate %
    ]);

  const series = [{
    name: 'Clientes',
    data: scatterData
  }];

  const options = {
    ...baseApexOptions,
    colors: ['#f43f5e'],
    xaxis: {
      title: { text: 'Volumen Estimado de Compra ($)', style: { color: '#94a3b8' } },
      labels: { formatter: (val) => formatShortCurrency(val) }
    },
    yaxis: {
      title: { text: 'Tasa de Devolución %', style: { color: '#94a3b8' } },
      labels: { formatter: (val) => `${val}%` }
    },
    tooltip: {
      y: { formatter: (val) => `${val}%` },
      x: { formatter: (val) => formatCurrency(val) }
    }
  };

  return <Chart options={options} series={series} type="scatter" height={320} />;
};

// 11. FUNNEL CHART - Returns reasons ranking
export const BIFunnelChart = ({ data = [] }) => {
  if (!data || data.length === 0) return (
    <div className="h-[320px] flex items-center justify-center text-slate-600 text-sm">Sin conceptos de devolución</div>
  );
  const sortedConcepts = [...data]
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, 7);

  const series = [{
    name: 'Porcentaje Devoluciones',
    data: sortedConcepts.map(c => Math.round(c.porcentaje * 100))
  }];

  const options = {
    ...baseApexOptions,
    colors: ['#e11d48'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '70%',
        isFunnel: true
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val, opt) => `${opt.w.globals.labels[opt.dataPointIndex]}: ${val}%`,
      dropShadow: { enabled: true }
    },
    xaxis: {
      categories: sortedConcepts.map(c => c.concepto)
    }
  };

  return <Chart options={options} series={series} type="bar" height={320} />;
};

// 12. ZONE RANKING CHART - Horizontal bars with compliance % and budget
export const BIZoneRankingChart = ({ zones = [] }) => {
  const top = [...zones]
    .sort((a, b) => b.ventasNetas - a.ventasNetas)
    .slice(0, 8);

  const compliance = top.map(z =>
    z.presupuesto > 0 ? Math.round((z.ventasNetas / z.presupuesto) * 100) : 0
  );

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const z = top[params[0].dataIndex];
        const pct = compliance[params[0].dataIndex];
        return `
          <div style="font-size:12px;line-height:1.8">
            <b>${z.zona}</b><br/>
            Vendedor: ${z.vendedor}<br/>
            Ventas: ${formatShortCurrency(z.ventasNetas)}<br/>
            Presupuesto: ${formatShortCurrency(z.presupuesto)}<br/>
            Cumplimiento: <b style="color:${pct>=100?'#10b981':pct>=80?'#f59e0b':'#ef4444'}">${pct}%</b>
          </div>`;
      }
    },
    grid: { left: '2%', right: '6%', top: '4%', bottom: '4%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', formatter: v => formatShortCurrency(v) },
      splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: top.map(z => z.zona).reverse(),
      axisLabel: { color: '#334155', fontSize: 11, fontWeight: 700 }
    },
    series: [
      {
        name: 'Presupuesto',
        type: 'bar',
        data: top.map(z => z.presupuesto).reverse(),
        barMaxWidth: 14,
        itemStyle: { color: '#e2e8f0', borderRadius: [0,4,4,0] },
        z: 1
      },
      {
        name: 'Ventas Netas',
        type: 'bar',
        data: top.map((z, i) => ({
          value: z.ventasNetas,
          itemStyle: {
            color: compliance[i] >= 100
              ? new echarts.graphic.LinearGradient(0,0,1,0,[
                  { offset:0, color:'#059669' },{ offset:1, color:'#10b981' }])
              : compliance[i] >= 80
              ? new echarts.graphic.LinearGradient(0,0,1,0,[
                  { offset:0, color:'#d97706' },{ offset:1, color:'#f59e0b' }])
              : new echarts.graphic.LinearGradient(0,0,1,0,[
                  { offset:0, color:'#dc2626' },{ offset:1, color:'#f87171' }]),
            borderRadius: [0,6,6,0]
          }
        })).reverse(),
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const origIdx = top.length - 1 - p.dataIndex;
            const pct = compliance[origIdx];
            return `{pct|${pct}%}`;
          },
          rich: {
            pct: { fontSize: 10, fontWeight: 700, color: '#0f172a' }
          }
        },
        z: 2
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

// 12. DONUT CHART - Distribution pie/donut chart for providers/returns/zones
export const BIDonutChart = ({ data = [], height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
        Sin datos disponibles
      </div>
    );
  }

  // Normalize: supports providers (proveedor/ventas2026), returns (concepto/porcentaje), or generic (name/value)
  const normalized = data
    .map(item => ({
      label: item.proveedor || item.name || item.label || item.concepto || 'Sin nombre',
      value: Math.round(Number(
        item.ventas2026 ||
        item.value ||
        item.ventas ||
        item.devoluciones ||
        0
      ))
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const labels = normalized.map(item => item.label);
  const series = normalized.map(item => item.value);

  const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#ef4444'];

  const option = {
    backgroundColor: 'transparent',
    color: PALETTE,
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        return `<div style="font-size:12px;line-height:1.8">
          <b>${params.name}</b><br/>
          ${formatShortCurrency(params.value)}<br/>
          <span style="color:${params.color}">${params.percent.toFixed(1)}%</span>
        </div>`;
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 8,
      textStyle: { color: '#334155', fontSize: 11, fontWeight: 600 },
      data: labels
    },
    series: [
      {
        name: 'Participación',
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params) => `{pct|${params.percent.toFixed(0)}%}`,
          rich: {
            pct: { fontSize: 10, fontWeight: 700, color: '#475569' }
          }
        },
        labelLine: {
          show: true,
          length: 8,
          length2: 10,
          lineStyle: { color: '#cbd5e1', width: 1.5 }
        },
        emphasis: {
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.15)' },
          scaleSize: 6
        },
        data: normalized.map((item, i) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: PALETTE[i % PALETTE.length] }
        }))
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: `${height}px`, width: '100%' }} />;
};
