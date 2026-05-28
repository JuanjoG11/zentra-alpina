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
    foreColor: '#94a3b8', // slate-400
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif'
  },
  grid: {
    borderColor: '#1e293b', // slate-800
    strokeDashArray: 4
  },
  tooltip: {
    theme: 'dark',
    x: { show: true }
  }
};

// 1. LINE CHART - Sales trend
export const BILineChart = ({ data = [], title = 'Tendencia de Ventas' }) => {
  const series = [{
    name: 'Ventas Totales',
    data: data.map(item => item.total)
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
  const series = data.map(item => item.ventas2026);
  const labels = data.map(item => item.proveedor);

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

// 5. HEATMAP CHART - Returns by concept & seller (using ECharts)
export const BIHeatmapChart = ({ returnsSellers = [], clientReturns = [] }) => {
  // Let's create a heatmap of concepts vs sellers
  const concepts = ['SIN PLATA', 'CERRADO', 'BODEGA', 'ERROR DEL VENDEDOR', 'EXTRARUTA', 'ESTADO', 'SEPARADO', 'INCOMPLETO'];
  // Take top 8 sellers
  const sellers = returnsSellers.slice(0, 8).map(s => s.nombre);
  
  // Create matrix: [conceptIndex, sellerIndex, value]
  const matrix = [];
  concepts.forEach((concept, cIdx) => {
    sellers.forEach((seller, sIdx) => {
      // Find return total for this seller & concept
      const sellerCode = returnsSellers.find(s => s.nombre === seller)?.ejecutivo;
      const totalVal = clientReturns
        .filter(c => c.ejecutivo === sellerCode && c.concepto.includes(concept))
        .reduce((sum, c) => sum + c.valor, 0);
      
      matrix.push([sIdx, cIdx, Math.round(totalVal / 1000)]); // Value in thousands
    });
  });

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (params) => {
        return `${sellers[params.value[0]]}<br/>${concepts[params.value[1]]}: ${formatCurrency(params.value[2] * 1000)}`;
      }
    },
    grid: { height: '70%', top: '10%', bottom: '20%', left: '15%', right: '5%' },
    xAxis: {
      type: 'category',
      data: sellers,
      splitArea: { show: true },
      axisLabel: { color: '#94a3b8', interval: 0, rotate: 30 }
    },
    yAxis: {
      type: 'category',
      data: concepts,
      splitArea: { show: true },
      axisLabel: { color: '#94a3b8' }
    },
    visualMap: {
      min: 0,
      max: 15000, // max is ~15M COP (in thousands = 15000)
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      textStyle: { color: '#94a3b8' },
      inRange: {
        color: ['#1e293b', '#2563eb', '#dc2626'] // slate -> blue -> red
      }
    },
    series: [
      {
        name: 'Devoluciones',
        type: 'heatmap',
        data: matrix,
        label: {
          show: false
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
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

  return <ReactECharts option={option} style={{ height: '320px', width: '100%' }} />;
};

// 7. GAUGE CHART - Compliance indicator
export const BIGaugeChart = ({ val = 0.973 }) => {
  const percentage = Math.round(val * 100);
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
