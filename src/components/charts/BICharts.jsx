import React from 'react';
import Chart from 'react-apexcharts';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { formatCurrency, formatPercent, formatShortCurrency } from '../../utils/formatters';

// Common ApexCharts configuration options for dark mode
const baseApexOptions = {
  theme: {
    mode: 'dark',
    palette: 'palette1'
  },
  chart: {
    background: 'transparent',
    foreColor: '#94a3b8',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
    // Desactivar animaciones previene el error "Cannot read properties of null (reading 'node')"
    // cuando el componente se desmonta antes de que termine la animación
    animations: {
      enabled: false
    },
    redrawOnParentResize: true,
    redrawOnWindowResize: true
  },
  grid: {
    borderColor: '#1e293b',
    strokeDashArray: 4
  },
  tooltip: {
    theme: 'dark',
    x: { show: true }
  },
  noData: {
    text: 'Sin datos',
    style: { color: '#475569', fontSize: '13px' }
  }
};

// 1. LINE CHART - Sales trend
export const BILineChart = ({ data = [], title = 'Tendencia de Ventas' }) => {
  if (!data || data.length === 0) return (
    <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm">Sin datos de ventas diarias</div>
  );
  const series = [{
    name: 'Ventas Totales',
    data: data.map(item => Math.round(item.total || 0))
  }];
  
  const options = {
    ...baseApexOptions,
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3b82f6'], // blue-500
    xaxis: {
      categories: data.map(item => item.fecha),
      labels: { rotate: -45, style: { fontSize: '10px' } }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatShortCurrency(val)
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 90, 100]
      }
    }
  };

  return <Chart options={options} series={series} type="line" height={320} />;
};

// 2. AREA CHART - Accumulated sales
export const BIAreaChart = ({ data = [], title = 'Ventas Acumuladas' }) => {
  let accumulated = 0;
  const accumData = data.map(item => {
    accumulated += item.total;
    return accumulated;
  });

  const series = [{
    name: 'Ventas Acumuladas',
    data: accumData
  }];

  const options = {
    ...baseApexOptions,
    stroke: { curve: 'straight', width: 2 },
    colors: ['#6366f1'], // indigo-500
    xaxis: {
      categories: data.map(item => item.fecha),
      labels: { rotate: -45, style: { fontSize: '10px' } }
    },
    yaxis: {
      labels: {
        formatter: (val) => formatShortCurrency(val)
      }
    },
    dataLabels: { enabled: false }
  };

  return <Chart options={options} series={series} type="area" height={320} />;
};

// 3. STACKED BAR CHART - Cash vs Credit Sales
export const BIStackedBarChart = ({ data = [] }) => {
  if (!data || data.length === 0) return (
    <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm">Sin datos</div>
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
export const BIDonutChart = ({ data = [] }) => {
  const filtered = (data || []).filter(item => item.ventas2026 > 0);
  if (filtered.length === 0) return (
    <div className="h-[340px] flex items-center justify-center text-slate-500 text-sm">Sin datos de proveedores</div>
  );
  const series = filtered.map(item => item.ventas2026);
  const labels = filtered.map(item => item.proveedor);

  const options = {
    ...baseApexOptions,
    labels: labels,
    colors: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#a855f7'],
    stroke: { show: false },
    legend: { position: 'bottom', horizontalAlign: 'center' },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Ventas',
              color: '#94a3b8',
              formatter: (w) => {
                const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                return formatShortCurrency(sum);
              }
            }
          }
        }
      }
    }
  };

  return <Chart options={options} series={series} type="donut" height={340} />;
};

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
          color: '#f8fafc',
          backgroundColor: '#1e293b'
        },
        itemStyle: {
          borderColor: '#0f172a',
          borderWidth: 2
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              borderColor: '#0f172a',
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
            className="rounded-xl border transition-all duration-200 cursor-default"
            style={{
              background: isHovered ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.5)',
              borderColor: isHovered ? 'rgba(99,102,241,0.4)' : 'rgba(30,41,59,0.6)',
            }}
            onMouseEnter={() => setHoveredSeller(idx)}
            onMouseLeave={() => setHoveredSeller(null)}
          >
            <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3">
              {/* Rank + Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-black w-5 text-center flex-shrink-0" style={{ color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#475569' }}>
                  #{idx + 1}
                </span>
                <p className="text-xs font-bold text-slate-200 truncate">{seller.nombre}</p>
              </div>
              {/* Total */}
              <span className="text-sm font-black text-rose-400 flex-shrink-0">
                {formatShortCurrency(seller.total)}
              </span>
            </div>

            {/* Stacked bar */}
            <div className="px-4 pb-1 mt-1">
              <div className="w-full h-4 rounded-lg overflow-hidden bg-slate-900 flex" style={{ width: '100%' }}>
                {segments.map(([concept, val], sIdx) => {
                  const segWidth = (val / seller.total) * barWidth;
                  const color = concept === 'OTROS'
                    ? '#475569'
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
                <div className="flex-1 h-full bg-slate-900/60" />
              </div>
            </div>

            {/* Concept pills — only on hover */}
            {isHovered && (
              <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
                {segments.map(([concept, val]) => {
                  const color = concept === 'OTROS' ? '#475569' : (CONCEPT_COLORS[concept]?.bg || '#64748b');
                  const textColor = concept === 'OTROS' ? '#94a3b8' : (CONCEPT_COLORS[concept]?.text || '#94a3b8');
                  return (
                    <span
                      key={concept}
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                      style={{ background: `${color}20`, color: textColor, borderColor: `${color}40` }}
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
            color: '#94a3b8',
            offsetY: 80,
            show: true,
            label: 'Cumplimiento'
          },
          value: {
            offsetY: 35,
            fontSize: '32px',
            color: '#ffffff',
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
export const BIWaterfallChart = ({ sales = 5347429635, returns = 42536287 }) => {
  const netSales = sales - returns;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const tar = params[1] || params[0];
        return `${tar.name}<br/>${formatCurrency(tar.value)}`;
      }
    },
    grid: { left: '15%', right: '5%', top: '10%', bottom: '15%' },
    xAxis: {
      type: 'category',
      splitLine: { show: false },
      data: ['Ventas Brutas', 'Devoluciones', 'Ventas Netas'],
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8',
        formatter: (val) => formatShortCurrency(val)
      },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'Placeholder',
        type: 'bar',
        stack: 'Total',
        itemStyle: {
          borderColor: 'transparent',
          color: 'transparent'
        },
        emphasis: {
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent'
          }
        },
        data: [0, netSales, 0] // bottom offsets
      },
      {
        name: 'Valor',
        type: 'bar',
        stack: 'Total',
        label: {
          show: true,
          position: 'inside',
          formatter: (params) => formatShortCurrency(params.value)
        },
        data: [
          {
            value: sales,
            itemStyle: { color: '#3b82f6' }
          },
          {
            value: returns,
            itemStyle: { color: '#ef4444' }
          },
          {
            value: netSales,
            itemStyle: { color: '#10b981' }
          }
        ]
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
    <div className="h-[320px] flex items-center justify-center text-slate-500 text-sm">Sin conceptos de devolución</div>
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
      splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: top.map(z => z.zona).reverse(),
      axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 600 }
    },
    series: [
      {
        name: 'Presupuesto',
        type: 'bar',
        data: top.map(z => z.presupuesto).reverse(),
        barMaxWidth: 14,
        itemStyle: { color: '#1e293b', borderRadius: [0,4,4,0] },
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
            pct: { fontSize: 10, fontWeight: 700, color: '#e2e8f0' }
          }
        },
        z: 2
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};
