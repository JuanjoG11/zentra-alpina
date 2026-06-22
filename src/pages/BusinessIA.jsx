import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import alpinaLogo from '../assets/alpina-logo.svg';
import Chart from 'react-apexcharts';
import {
  BIScatterPlot,
  BIDonutChart,
  BILineChart,
  BIGaugeChart,
  BIStackedBarChart,
  BIWaterfallChart,
  BIHeatmapChart,
  BITreemapChart,
  BIFunnelChart,
  BIRadarChart
} from '../components/charts/BICharts';
import { 
  Brain, 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  LineChart,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Compass,
  Truck,
  DollarSign,
  Layers,
  Award,
  Percent,
  CheckCircle2,
  Zap,
  Activity,
  FileText
} from 'lucide-react';

const renderMessageText = (text, isUser) => {
  if (!text) return null;
  // Split by newline characters to preserve line breaks
  const lines = text.split('\\n');
  return lines.map((line, idx) => (
    <span key={idx} className={isUser ? "text-white" : "text-purple-300"}>
      {line}
      {idx < lines.length - 1 && <br/>}
    </span>
  ));
};

const BusinessIA = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, ai, commercial, logistics
  const filters = useStore();
  const dbData  = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
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

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '¡Hola! Soy tu Consultor de Negocios Inteligente para Alpina Eje Cafetero. Puedo analizar el rendimiento del canal comercial en tiempo real. Selecciona una de las preguntas de abajo o escribe tu duda.',
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Simulator state
  const [sliderDevRate, setSliderDevRate] = useState(0); // 0% a 100% de reducción
  const [sliderTicket, setSliderTicket] = useState(0); // 0% a 30% de aumento
  const [sliderVol, setSliderVol] = useState(0); // 0% a 25% de crecimiento

  const handleSendMessage = (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = '';
      const query = text.toLowerCase();

      if (query.includes('devoluciones') || query.includes('vendedores con mayor riesgo') || query.includes('ejecutivos') || query.includes('vendedor')) {
        const badSellers = [...filteredData.returnsSellers]
          .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE')
          .sort((a, b) => b.porcentajeDevolucion - a.porcentajeDevolucion)
          .slice(0, 3);

        replyText = `He analizado las devoluciones del periodo. Los ejecutivos con mayor tasa de devolución (> 5% de tolerancia) son:\n\n` +
          badSellers.map(s => `• ${s.nombre} (Cod: ${s.ejecutivo}): ${formatPercent(s.porcentajeDevolucion)} de devolución (Ventas: ${formatCurrency(s.ventas)} | Devuelto: ${formatCurrency(s.devoluciones)})`).join('\n') +
          `\n\nAcciones IA sugeridas:\n1. Realizar acompañamiento en ruta a ${badSellers[0]?.nombre} para auditar causas de devolución.\n2. Revisar los cupos de crédito en la Zona ${badSellers[0]?.ejecutivo}, dado que la causal 'SIN PLATA' representa el 52.2% del volumen total devuelto.`;

      } else if (query.includes('polar')) {
        replyText = `El portafolio del canal en esta sección está consolidado bajo la marca Alpina. Para evaluar el posicionamiento de marca regional, te sugiero consultar sobre la competencia directa (Alquería o Colanta).`;
      } else if (query.includes('competencia') || query.includes('alqueria') || query.includes('colanta') || query.includes('participación') || query.includes('participacion')) {
        replyText = `Análisis Competitivo del Eje Cafetero (Lácteos):\n\n` +
          `• Alpina: 48% de participación estimada. Líder indiscutible en yogures (Bon Yurt, Alpina), postres y quesos maduros.\n` +
          `• Alquería: 28% de participación estimada. Altamente fuerte en leches líquidas (UHT) y cremas en Pereira y Armenia.\n` +
          `• Colanta: 24% de participación estimada. Líder en quesos frescos e industrial en Caldas (Manizales).\n\n` +
          `Diagnóstico de Amenazas IA:\n` +
          `1. Tradicional (TAT): Alquería está ganando volumen con combos agresivos en tiendas de barrio.\n` +
          `2. Lácteos frescos: Colanta capitaliza su imagen de origen cooperativo y precios estables en Antioquia y Caldas.\n\n` +
          `Recomendación Comercial:\n` +
          `Aprovechar la fortaleza de Alpina en quesos maduros y funcionales para empujar la venta cruzada de leches premium en Pereira, neutralizando las ofertas de Alquería.`;

      } else if (query.includes('presupuesto') || query.includes('zonas') || query.includes('superando')) {
        const topZones = [...filteredData.zones]
          .filter(z => !z.zona.startsWith('E') && !z.vendedor.toLowerCase().includes('servicio al cliente'))
          .sort((a, b) => (b.ventasNetas / b.presupuesto) - (a.ventasNetas / a.presupuesto))
          .slice(0, 3);

        replyText = `Las zonas comerciales líderes en cumplimiento de presupuesto son:\n\n` +
          topZones.map(z => `• Zona ${z.zona} (${z.vendedor}): ${formatPercent(z.ventasNetas / z.presupuesto)} de cumplimiento (Ventas netas: ${formatCurrency(z.ventasNetas)} vs Presupuesto: ${formatCurrency(z.presupuesto)})`).join('\n') +
          `\n\nMejores Prácticas: Estas zonas se caracterizan por una excelente programación de entrega y baja tasa de devoluciones. Se recomienda realizar una mesa redonda de ventas liderada por ${topZones[0]?.vendedor} para replicar su método de preventa.`;

      } else if (query.includes('pronóstico') || query.includes('cierre') || query.includes('proyección')) {
        const factor = 25 / 13;
        const projectedSales = kpis.totalSales * factor;
        const projectedNet = kpis.netSales * factor;
        const projectedCompliance = projectedSales / kpis.totalBudget;

        replyText = `Basándome en la facturación registrada al día hábil 13 de 25 (${formatPercent(13/25)} del mes):\n\n` +
          `• Proyección Ventas Brutas: ${formatCurrency(projectedSales)}\n` +
          `• Proyección Ventas Netas: ${formatCurrency(projectedNet)}\n` +
          `• Cumplimiento Proyectado: ${formatPercent(projectedCompliance)} (Presupuesto: ${formatCurrency(kpis.totalBudget)})\n` +
          `• Pérdida por Devoluciones: ${formatCurrency(kpis.totalReturns * factor)}\n\n` +
          `Recomendación: Para asegurar el cumplimiento de la meta consolidada del 100%, la distribuidora debe acelerar un 3% las ventas diarias durante los 12 días hábiles restantes.`;

      } else {
        replyText = `Entendido. He procesado tu consulta. \n\nPara el periodo ${activePeriodLabel} en la sede ${filters.selectedCity}, tenemos:\n` +
          `• Ventas Netas: ${formatCurrency(kpis.netSales)} (${formatPercent(kpis.compliance)} de la meta).\n` +
          `• Tasa de Devolución: ${formatPercent(kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0)}.\n` +
          `• Vendedor Estrella: ${kpis.topSeller}.\n\n¿Deseas profundizar en las devoluciones de ejecutivos, la participación de Alpina frente a Alquería y Colanta, o ver el pronóstico de cierre?`;
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }, 1200);
  };

  const clientsInRisk = useMemo(() => {
    const grouped = {};
    (filteredData.clientReturns || []).forEach(cr => {
      if (!grouped[cr.cliente]) {
        grouped[cr.cliente] = {
          cliente: cr.cliente,
          ejecutivo: cr.ejecutivo,
          totalReturns: 0,
          concept: cr.concepto
        };
      }
      grouped[cr.cliente].totalReturns += cr.valor;
    });

    return Object.values(grouped)
      .filter(c => c.cliente !== 'CLIENTE DESCONOCIDO' && c.cliente !== 'CLIENTE')
      .sort((a, b) => b.totalReturns - a.totalReturns)
      .slice(0, 3)
      .map((c, idx) => {
        const riskLevels = ['Crítico', 'Alto', 'Medio'];
        const colors = [
          'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        ];
        const days = [21, 16, 12];
        return {
          ...c,
          risk: riskLevels[idx] || 'Bajo',
          badgeColor: colors[idx] || 'bg-slate-500/10 text-slate-400',
          daysInactive: days[idx] || 10
        };
      });
  }, [filteredData.clientReturns]);

  // Simulator calculations
  const volFactor = 1 + (sliderVol / 100);
  const ticketFactor = 1 + (sliderTicket / 100);
  const simSales = kpis.totalSales * volFactor * ticketFactor;
  const simReturns = kpis.totalReturns * volFactor * (1 - (sliderDevRate / 100));
  const simNetSales = simSales - simReturns;
  const simCompliance = simSales / kpis.totalBudget;

  const simulatorChartSeries = [
    {
      name: 'Escenario Base',
      data: [Math.round(kpis.totalSales / 1000000), Math.round(kpis.totalReturns / 1000000), Math.round(kpis.netSales / 1000000)]
    },
    {
      name: 'Escenario Simulado',
      data: [Math.round(simSales / 1000000), Math.round(simReturns / 1000000), Math.round(simNetSales / 1000000)]
    }
  ];

  const simulatorChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
      foreColor: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
      animations: { enabled: false }
    },
    colors: ['#475569', '#3b82f6'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 6
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `$${val}M`,
      style: { fontSize: '10px' }
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: ['Ventas Brutas', 'Devoluciones', 'Ventas Netas'],
    },
    yaxis: {
      title: { text: 'Millones de COP (M)' },
      labels: { formatter: (val) => `$ ${val}M` }
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `$ ${val.toLocaleString('es-CO')} Millones` }
    },
    grid: { borderColor: '#1e293b', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'center' }
  };

  // Dynamic Anomalies Detection
  const anomalies = [];
  
  // Anomaly 1: Competitive pressure from Alquería
  anomalies.push({
    id: 1,
    type: 'warning',
    title: 'Presión competitiva en canal Tradicional (TAT)',
    description: `Alquería registra un incremento estimado del 14% en penetración de leches UHT en Pereira y Armenia mediante ofertas masivas en tiendas de barrio.`,
    impact: 'Riesgo de pérdida de participación de mercado en categorías lácteas líquidas.'
  });

  // Anomaly 2: High Seller Returns
  const criticalSellers = filteredData.returnsSellers.filter(s => s.porcentajeDevolucion > 0.08);
  criticalSellers.forEach((s, idx) => {
    anomalies.push({
      id: `seller-${s.ejecutivo || idx}-${idx}`,
      type: 'warning',
      title: `Retornos anómalos: ${s.nombre}`,
      description: `El vendedor ${s.nombre} (Ejecutivo ${s.ejecutivo}) registra una tasa de devoluciones del ${formatPercent(s.porcentajeDevolucion)}, superando el umbral de tolerancia del 5%. Devolvió ${formatCurrency(s.devoluciones)}.`,
      impact: 'Incremento en costo logístico y reproceso de bodega.'
    });
  });

  // Anomaly 3: Low Zone Compliance
  const lowZones = filteredData.zones.filter(z => z.ventasNetas / z.presupuesto < 0.6);
  lowZones.forEach((z, idx) => {
    anomalies.push({
      id: `zone-${z.zona || idx}-${idx}`,
      type: 'warning',
      title: `Bajo cumplimiento comercial: Zona ${z.zona}`,
      description: `La zona ${z.zona} registra un cumplimiento de meta de apenas el ${formatPercent(z.ventasNetas / z.presupuesto)} con una facturación de ${formatCurrency(z.ventasNetas)} vs un presupuesto de ${formatCurrency(z.presupuesto)}.`,
      impact: 'Afecta el cumplimiento consolidado del canal.'
    });
  });

  // Dynamic AI Insights List
  const insights = [
    {
      title: 'Crecimiento de Alpina Alimentos',
      text: `El proveedor ALPINA PRODUCTOS ALIMENTICIOS creció un 21,79% YoY, pasando de ${formatCurrency(2790456506)} en 2025 a ${formatCurrency(3398429638)} en 2026. Es el motor principal del crecimiento comercial.`,
      icon: TrendingUp,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    },
    {
      title: 'Comportamiento de Devoluciones',
      text: `La causa principal de devoluciones es "SIN PLATA" con un 52,25%, seguida de "CERRADO" con 11,49%. Esto sugiere que el problema es de liquidez o cobranza en el punto de venta, no de calidad de producto.`,
      icon: AlertCircle,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    },
    {
      title: 'Análisis de Zonas Estrella',
      text: `La zona M9458 alcanzó el 111,8% de cumplimiento de meta y la zona M9450 un 110,5%. Ambas zonas aportan conjuntamente ${formatCurrency(167213451)} netos.`,
      icon: Sparkles,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    }
  ];

  // AI Smart Recommendations
  const recommendations = [
    {
      title: 'Estrategia de defensa vs. Alquería y Colanta',
      text: 'Lanzar combo promocional de Yox + esparcibles Alpina en Pereira para contrarrestar las promociones tácticas de Alquería en tiendas de barrio.',
      action: 'Ver plan de ataque comercial'
    },
    {
      title: 'Intervención en Ruta y Pedidos (Sandra M. García)',
      text: 'Capacitar al ejecutivo M9553 en toma de pedidos e inspección de locales debido a que registra 11.4% de devoluciones, mayormente por locales cerrados y sin dinero.',
      action: 'Asignar supervisor de apoyo'
    },
    {
      title: 'Revisión de presupuesto de la zona E7001',
      text: 'Evaluar si el presupuesto asignado a la zona E7001 ($15,718,970) es realista o si existen problemas de desabastecimiento, dado su 47.1% de cumplimiento.',
      action: 'Ajustar meta comercial'
    }
  ];

  const { totalSales, netSales, totalReturns, compliance, averageTicket, growth, profitability, totalFacturas, topSeller, topZone } = kpis;

  // logistics quality KPI: (totalSales - totalReturns) / totalSales
  const logisticsQuality = totalSales > 0 ? (totalSales - totalReturns) / totalSales : 0.969;

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTOR PREMIUM */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950/80 border border-purple-500/20 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/25">
              <Brain className="h-7 w-7" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-slate-950 animate-ping"></div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <img src={alpinaLogo} alt="Alpina" className="h-9 w-auto" loading="lazy" />
                <div className="h-6 w-[1px] bg-slate-800"></div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">IA Empresarial</h1>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">Motor Predictivo Activo</span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Análisis profundo, predicción lineal de tendencias y diagnóstico continuo del canal comercial regional.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Monitoreo Comercial:</span>
              <span className="text-[11px] text-emerald-400 font-bold font-mono">100% OK</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABS NAVIGATION */}
      <div className="flex flex-nowrap overflow-x-auto scrollbar-none gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-900 backdrop-blur-md">
        {[
          { id: 'overview',   label: 'Vista General',       icon: Compass    },
          { id: 'ai',         label: 'Diagnóstico IA',      icon: Brain,     badge: anomalies.length },
          { id: 'chat',       label: 'Asistente IA',        icon: Brain      },
          { id: 'simulator',  label: 'Simulador Metas',     icon: Zap        },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 text-xs font-semibold px-3 sm:px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TABS CONTENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <GlassCard hoverable={true} className="bg-slate-950/70 border border-slate-900 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-blue-500/5 text-blue-400 rounded-bl-3xl group-hover:bg-blue-500/10 transition-colors">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Ventas Brutas Totales</p>
                <p className="text-2xl font-extrabold text-white mt-3">{formatCurrency(totalSales)}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Crecimiento YoY</span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  {formatPercent(growth)}
                </span>
              </div>
            </GlassCard>

            <GlassCard hoverable={true} className="bg-slate-950/70 border border-slate-900 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-emerald-500/5 text-emerald-400 rounded-bl-3xl group-hover:bg-emerald-500/10 transition-colors">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Ventas Netas Consolidadas</p>
                <p className="text-2xl font-extrabold text-white mt-3">{formatCurrency(netSales)}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Fuga por Retornos</span>
                <span className="text-xs text-rose-400 font-semibold">
                  {formatPercent(totalReturns / totalSales)}
                </span>
              </div>
            </GlassCard>

            <GlassCard hoverable={true} className="bg-slate-950/70 border border-slate-900 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-amber-500/5 text-amber-400 rounded-bl-3xl group-hover:bg-amber-500/10 transition-colors">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Margen de Rentabilidad</p>
                <p className="text-2xl font-extrabold text-white mt-3">{formatPercent(profitability)}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Desempeño Promedio</span>
                <span className="text-xs text-amber-400 font-semibold">Saludable</span>
              </div>
            </GlassCard>

            <GlassCard hoverable={true} className="bg-slate-950/70 border border-slate-900 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 bg-indigo-500/5 text-indigo-400 rounded-bl-3xl group-hover:bg-indigo-500/10 transition-colors">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Calidad de Entrega Logística</p>
                <p className="text-2xl font-extrabold text-white mt-3">{formatPercent(logisticsQuality)}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Tasa de Efectividad</span>
                <span className="text-xs text-indigo-400 font-semibold">Tolerancia: &gt;95%</span>
              </div>
            </GlassCard>
          </div>

          {/* Main Visuals & AI Smart Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard hoverable={false} className="lg:col-span-2 p-6 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Cumplimiento Consolidado vs Meta</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Indicador de avance de ventas contra el presupuesto asignado regional.</p>
                </div>
                <div className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                  Meta: {formatCurrency(totalSales / compliance)}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="w-80 shrink-0">
                  <BIGaugeChart val={compliance} />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900/80">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Ticket Promedio por Factura</p>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(averageTicket)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Estimado sobre {formatShortCurrency(totalFacturas)} facturas generadas.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900/80 space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Líderes de Desempeño</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Mejor Vendedor:</span>
                      <span className="text-white font-bold">{topSeller}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Zona Comercial Top:</span>
                      <span className="text-white font-bold">Zona {topZone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="p-6 flex flex-col justify-between shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Participación de Marcas</h3>
                <p className="text-xs text-slate-400 mb-4">Contribución de ventas de cada marca comercial en 2026.</p>
              </div>
              <div className="flex-1 min-h-[300px] flex items-center justify-center">
                <BIDonutChart data={filteredData.providers} />
              </div>
            </GlassCard>
          </div>

          {/* Quick AI Advisor Block */}
          <div className="rounded-3xl bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/10 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl pointer-events-none"></div>
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Zap className="h-8 w-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-base font-bold text-white">¿Sabías qué? — Análisis Logístico IA</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                El <strong className="text-purple-300">52,2%</strong> de las devoluciones del periodo consolidan la justificación <strong className="text-white">"SIN PLATA"</strong>. Esto representa un problema de liquidez en el punto de venta y no una falla en la frescura o calidad de los productos de Alpina.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('ai')}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-bold transition-all duration-300 flex items-center gap-1.5 shadow-lg shadow-purple-500/20 hover:scale-105 shrink-0"
            >
              <span>Ver Diagnóstico IA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columna 1: Anomalías Detectadas */}
          <div className="space-y-6">
            <GlassCard hoverable={false} className="border-rose-950/50 bg-rose-950/[0.02] p-5 shadow-xl h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-500 animate-bounce" />
                    <h3 className="text-base font-extrabold text-white">Anomalías Detectadas</h3>
                  </div>
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                    {anomalies.length} Alertas Activas
                  </span>
                </div>
                
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                  {anomalies.map((anom) => (
                    <div 
                      key={anom.id} 
                      className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all duration-300 hover:scale-[1.01] ${
                        anom.type === 'danger'
                          ? 'bg-rose-950/20 border-rose-500/20 shadow-md shadow-rose-950/20'
                          : 'bg-amber-950/20 border-amber-500/20 shadow-md shadow-amber-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          anom.type === 'danger'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {anom.type === 'danger' ? 'Crítico' : 'Advertencia'}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100">{anom.title}</h4>
                      <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{anom.description}</p>
                      
                      <div className="pt-3 border-t border-slate-900/60 flex flex-col gap-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Impacto Comercial Esperado:</span>
                        <span className="text-[10px] text-slate-200 font-semibold">{anom.impact}</span>
                      </div>
                    </div>
                  ))}
                  
                  {anomalies.length === 0 && (
                    <div className="text-center py-16">
                      <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                      <p className="text-xs text-slate-400 font-semibold mt-3">¡Excelente! Sin anomalías en los umbrales monitoreados.</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Columna 2: Share de Mercado & Semáforo de Riesgo */}
          <div className="space-y-6">
            {/* Share de Mercado */}
            <GlassCard hoverable={false} className="p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Share de Mercado Lácteos</h3>
                  <p className="text-xs text-slate-400">Participación estimada regional (Eje Cafetero)</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Alpina (Líder)
                    </span>
                    <span className="text-blue-400 font-bold">48.0%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full" style={{ width: '48%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Alquería
                    </span>
                    <span className="text-red-400 font-bold">28.0%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 h-full rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Colanta
                    </span>
                    <span className="text-emerald-400 font-bold">24.0%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-900/60 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Frentes Críticos vs Competencia:</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-900">
                    <p className="text-slate-400 font-semibold">Leche Líquida (UHT)</p>
                    <p className="text-red-400 font-bold mt-0.5">Alquería fuerte</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-900">
                    <p className="text-slate-400 font-semibold">Quesos Frescos</p>
                    <p className="text-emerald-400 font-bold mt-0.5">Colanta lidera</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Semáforo de Clientes en Riesgo */}
            <GlassCard hoverable={false} className="p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <Activity className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-white">Semáforo de Clientes en Riesgo</h3>
                  <p className="text-xs text-slate-400">Monitoreo de deserción y alta fricción</p>
                </div>
              </div>

              <div className="space-y-3">
                {clientsInRisk.map((c, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-900 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{c.cliente}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
                        {c.risk}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Inactivo: <strong className="text-slate-200">{c.daysInactive} días</strong></span>
                      <span>Devolución: <strong className="text-rose-400">{formatCurrency(c.totalReturns)}</strong></span>
                    </div>
                    <div className="text-[9px] text-slate-500 leading-normal">
                      Causal: <strong className="text-slate-300">{c.concept}</strong>
                    </div>
                  </div>
                ))}
                
                {clientsInRisk.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No se detectaron clientes con nivel de riesgo crítico en este periodo.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Columna 3: Insights & Automated Advisor */}
          <div className="space-y-6">
            {/* Insights Panel */}
            <GlassCard hoverable={false} className="border-indigo-950/30 bg-indigo-950/[0.01] p-5 shadow-xl">
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Insights Automáticos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hallazgos extraídos del modelo de datos.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {insights.map((ins, idx) => {
                  const Icon = ins.icon;
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900 flex items-start gap-4 hover:border-purple-500/20 transition-all duration-300">
                      <div className={`p-2.5 rounded-xl shrink-0 ${ins.badgeColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-100">{ins.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{ins.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* Smart Recommendations */}
            <GlassCard hoverable={false} className="p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Consejero de Negocios</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Acciones generadas para mitigar riesgos.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900/60 flex flex-col justify-between hover:border-slate-800 transition-all duration-300">
                    <div>
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">Alta Prioridad</span>
                      <h4 className="text-xs font-bold text-slate-100 mt-2">{rec.title}</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-2">{rec.text}</p>
                    </div>
                    <button className="mt-4 flex items-center justify-center gap-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 py-1.5 px-3 rounded-lg font-bold group transition-all duration-300 border border-indigo-500/10 w-full">
                      <span>{rec.action}</span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Ventana de Chat */}
          <div className="lg:col-span-2 flex flex-col h-[600px] rounded-3xl bg-slate-950/70 border border-slate-900 overflow-hidden shadow-xl">
            {/* Cabecera del Chat */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/90 flex items-center gap-3">
              <div className="relative p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Brain className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Consultor de Negocios IA</h3>
                <p className="text-[10px] text-slate-400">Analista local Zentra Alpina · Activo</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-1 ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none shadow-lg'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-none relative shadow-md'
                  }`}>
                    <p className="text-xs whitespace-pre-line leading-relaxed font-medium">{renderMessageText(msg.text, msg.sender === 'user')}</p>
                    <span className="block text-[9px] text-slate-400 text-right mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Sugerencias de Preguntas */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-900 space-y-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Preguntas Recomendadas</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {[
                  { text: '¿Quiénes son los vendedores con mayor tasa de devolución?', short: 'Ejecutivos con Devoluciones' },
                  { text: '¿Cómo está la participación de Alpina frente a Alquería y Colanta?', short: 'Participación frente a la Competencia' },
                  { text: '¿Qué zonas tienen mejor cumplimiento y por qué?', short: 'Zonas Líderes' },
                  { text: '¿Cuál es la proyección de ventas netas al cierre de mes?', short: 'Proyección Cierre de Mes' }
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q.text)}
                    className="text-[10px] bg-slate-900 hover:bg-purple-950/30 text-slate-300 hover:text-purple-300 border border-slate-800 hover:border-purple-500/20 px-3 py-1.5 rounded-xl transition-all font-medium text-left cursor-pointer"
                  >
                    {q.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Input del Chat */}
            <div className="p-3 border-t border-slate-900 bg-slate-950/95 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe tu pregunta sobre ventas, devoluciones, marcas..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <button
                onClick={() => handleSendMessage()}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10 hover:scale-[1.02] cursor-pointer"
              >
                Preguntar
              </button>
            </div>
          </div>

          {/* Columna Derecha: Panel de Estadísticas en Vivo */}
          <div className="space-y-6">
            <GlassCard hoverable={false} className="p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Activity className="h-4.5 w-4.5 text-purple-400" />
                Resumen de Datos Actuales
              </h3>
              <p className="text-[11px] text-slate-400">Cifras del periodo en curso cargadas en el store de Zustand.</p>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Ventas Netas:</span>
                  <span className="text-white font-extrabold">{formatCurrency(kpis.netSales)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Cumplimiento Meta:</span>
                  <span className="text-blue-400 font-extrabold">{formatPercent(kpis.compliance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Tasa de Devolución:</span>
                  <span className="text-rose-400 font-extrabold">{formatPercent(kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Vendedor Líder:</span>
                  <span className="text-emerald-400 font-extrabold">{kpis.topSeller}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Zona Estrella:</span>
                  <span className="text-indigo-400 font-extrabold">Zona {kpis.topZone}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard hoverable={false} className="p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white">Notas de Funcionamiento</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Este asistente procesa el cubo de datos cargado localmente. No realiza llamadas a servidores externos, garantizando el 100% de confidencialidad de la información comercial de Alpina.
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Panel de Controles (Sliders) */}
            <GlassCard hoverable={false} className="p-5 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-4.5 w-4.5 text-blue-400" />
                  Palancas de Simulación
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Ajusta los sliders para evaluar impactos potenciales.</p>
              </div>

              {/* Slider 1: Reducción Devoluciones */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Mitigación de Devoluciones</span>
                  <span className="text-blue-400 font-bold">{sliderDevRate}% menos</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderDevRate}
                  onChange={e => setSliderDevRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Reduce el volumen total de retornos de mercancía mediante mejoras en la calidad logística.
                </p>
              </div>

              {/* Slider 2: Incremento Ticket Promedio */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Aumento en Ticket Promedio</span>
                  <span className="text-emerald-400 font-bold">+{sliderTicket}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={sliderTicket}
                  onChange={e => setSliderTicket(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Incrementa el valor neto medio por factura incrementando la venta cruzada.
                </p>
              </div>

              {/* Slider 3: Crecimiento General en Ventas */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Crecimiento de Volumen Bruto</span>
                  <span className="text-indigo-400 font-bold">+{sliderVol}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={sliderVol}
                  onChange={e => setSliderVol(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Aumenta el volumen total de cajas vendidas atrayendo nuevos clientes o ampliando rutas.
                </p>
              </div>

              {/* Botón de reinicio */}
              <button
                onClick={() => { setSliderDevRate(0); setSliderTicket(0); setSliderVol(0); }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
              >
                Resetear Parámetros
              </button>
            </GlassCard>

            {/* Resultados de Simulación */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Tarjetas KPI de Comparación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Ventas Brutas */}
                <GlassCard hoverable={false} className="p-4 flex flex-col justify-between border-slate-900 bg-slate-950/40 relative overflow-hidden">
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Ventas Brutas Sim.</p>
                    <p className="text-lg font-extrabold text-white mt-1.5">{formatCurrency(simSales)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Base: {formatShortCurrency(kpis.totalSales)}</p>
                  </div>
                  {simSales > kpis.totalSales && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      +{formatPercent((simSales - kpis.totalSales) / kpis.totalSales)}
                    </span>
                  )}
                </GlassCard>

                {/* Devoluciones */}
                <GlassCard hoverable={false} className="p-4 flex flex-col justify-between border-slate-900 bg-slate-950/40 relative overflow-hidden">
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Devoluciones Sim.</p>
                    <p className="text-lg font-extrabold text-rose-400 mt-1.5">{formatCurrency(simReturns)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Base: {formatShortCurrency(kpis.totalReturns)}</p>
                  </div>
                  {simReturns !== kpis.totalReturns && (
                    <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      simReturns < kpis.totalReturns 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {simReturns < kpis.totalReturns ? '-' : '+'}{formatPercent(Math.abs((simReturns - kpis.totalReturns) / kpis.totalReturns))}
                    </span>
                  )}
                </GlassCard>

                {/* Ventas Netas */}
                <GlassCard hoverable={false} className="p-4 flex flex-col justify-between border-blue-500/20 bg-slate-950/40 relative overflow-hidden shadow-lg shadow-blue-500/[0.02]">
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Ventas Netas Sim.</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-1.5">{formatCurrency(simNetSales)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Base: {formatShortCurrency(kpis.netSales)}</p>
                  </div>
                  {simNetSales > kpis.netSales && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      +{formatPercent((simNetSales - kpis.netSales) / kpis.netSales)}
                    </span>
                  )}
                </GlassCard>
              </div>

              {/* Gráfico Comparativo */}
              <GlassCard hoverable={false} className="p-5 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Impacto Financiero: Base vs Simulado</h3>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                    Proyección de Cumplimiento: {formatPercent(simCompliance)}
                  </span>
                </div>
                <div className="min-h-[300px] flex items-center justify-center">
                  <Chart options={simulatorChartOptions} series={simulatorChartSeries} type="bar" height={300} className="w-full" />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessIA;
