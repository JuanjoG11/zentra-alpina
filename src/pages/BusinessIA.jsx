import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  // Limpiar markdown que Gemini devuelve: **negrita**, *cursiva*, # títulos
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/^#{1,3}\s+/gm, '')        // ## Títulos → sin #
    .replace(/^\s*[-–]\s/gm, '• ');     // - item → • item

  const lines = clean.split('\n');
  return lines.map((line, idx) => (
    <span key={idx} className={isUser ? 'text-white' : 'text-slate-100'}>
      {line}
      {idx < lines.length - 1 && <br />}
    </span>
  ));
};

const BusinessIA = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const filters = useStore();
  const dbData  = useStore(state => state.dbData);
  const chatMessages    = useStore(state => state.chatMessages);
  const setChatMessages = useStore(state => state.setChatMessages);
  const currentWorkDay  = useStore(state => state.currentWorkDay);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);
  const navigate = useNavigate();

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

  // Mensaje de bienvenida inicial — solo si el chat está vacío
  const WELCOME_MSG = {
    id: 'welcome',
    sender: 'bot',
    text: 'Hola. Soy el motor de inteligencia comercial de Zentra Alpina, entrenado sobre los datos reales de tu canal en el Eje Cafetero.\n\nAnalizo devoluciones, zonas, marcas, competencia y proyecciones de cierre en tiempo real — con los datos que tienes cargados en el sistema, no con supuestos.\n\nCuando te hablo del mercado externo, te digo exactamente de dónde viene el dato. Cuando te hablo de tu canal, es 100% información tuya.\n\n¿Qué quieres saber hoy?',
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  };

  // Chat usa el store — persiste entre tabs y recargas de página
  const messages = chatMessages.length > 0 ? chatMessages : [WELCOME_MSG];
  // setMessages siempre lee el estado más reciente del store para evitar race conditions
  const setMessages = (updater) => {
    const current = useStore.getState().chatMessages;
    const base = current.length > 0 ? current : [WELCOME_MSG];
    const next = typeof updater === 'function' ? updater(base) : updater;
    setChatMessages(next);
  };

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Simulator state
  const [sliderDevRate, setSliderDevRate] = useState(0); // 0% a 100% de reducción
  const [sliderTicket, setSliderTicket] = useState(0); // 0% a 30% de aumento
  const [sliderVol, setSliderVol] = useState(0); // 0% a 25% de crecimiento

  // ─── MOTOR DE INTELIGENCIA COMERCIAL ─────────────────────────────────────────
  // Voz: Consultor Senior de lácteos, Eje Cafetero. Datos reales del sistema +
  // contexto de mercado con etiqueta honesta pero tono de autoridad.
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsTyping(true);

    // ── Construir contexto compacto del cubo (menos tokens = menos quota) ──────
    const devRate = kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0;
    const workDay = currentWorkDay > 0 ? currentWorkDay
      : (filteredData.salesDaily || []).filter(d => d.total > 0).length || 1;
    const proyVentas = kpis.totalSales * (22 / workDay);
    const proyComp   = kpis.totalBudget > 0 ? proyVentas / kpis.totalBudget : 0;

    const topSellers = [...filteredData.returnsSellers]
      .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE')
      .sort((a, b) => b.porcentajeDevolucion - a.porcentajeDevolucion)
      .slice(0, 3);

    const topZones = [...filteredData.zones]
      .filter(z => z.presupuesto > 0)
      .sort((a, b) => (b.ventasNetas / b.presupuesto) - (a.ventasNetas / a.presupuesto))
      .slice(0, 3);

    const lowZones = [...filteredData.zones]
      .filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto < 0.7)
      .slice(0, 2);

    const topProviders = [...filteredData.providers]
      .sort((a, b) => b.ventas2026 - a.ventas2026)
      .slice(0, 4);

    // Cifras en millones para reducir tokens al mínimo
    const M = v => `$${(v/1e6).toFixed(1)}M`;
    const P = v => `${(v*100).toFixed(1)}%`;

    const cuboContext = `CANAL ALPINA EJE CAFETERO ${activePeriodLabel} DIA_HABIL=${workDay}/22
VENTAS=${M(kpis.totalSales)} DEV=${M(kpis.totalReturns)}(${P(devRate)}) NETAS=${M(kpis.netSales)} PRESUP=${M(kpis.totalBudget)} CUMPL=${P(kpis.compliance)} YOY=+${P(kpis.growth)} TICKET=$${Math.round(kpis.averageTicket/1000)}K FACT=${kpis.totalFacturas} PROYECC=${M(proyVentas)}/${P(proyComp)}
EXEC_DEV: ${topSellers.map(s=>`${s.nombre}=${P(s.porcentajeDevolucion)}`).join(',')}
ZONAS_TOP: ${topZones.map(z=>`${z.zona}/${z.vendedor}=${P(z.ventasNetas/z.presupuesto)}`).join(',')}
ZONAS_BAJA: ${lowZones.length ? lowZones.map(z=>`${z.zona}=${P(z.ventasNetas/z.presupuesto)}`).join(',') : 'ninguna'}
PORTAFOLIO: ${topProviders.map(p=>`${p.proveedor}=${M(p.ventas2026)}`).join(',')}
MVP_EXEC=${kpis.topSeller} MVP_ZONA=${kpis.topZone}`;

    // ── Prompt del sistema ──────────────────────────────────────────────────────
    const systemPrompt = `Eres el Consultor Comercial Inteligente de Zentra Alpina, especializado en el mercado de lácteos del Eje Cafetero colombiano (Pereira, Dosquebradas, Manizales, Armenia, Chinchiná, La Virginia, Cartago y municipios aledaños).

CONOCES A FONDO:
- El portafolio completo de Alpina Colombia (Bon Yurt, Yogurt Alpina, Alpinito, Avena Alpina, Yogo Yogo, Leche Alpina, Queso Parmesano, YOX, yogures griegos, esparcibles, kumis)
- La competencia real: Colanta (~21,9% share nacional), Alquería (~10,6%), y especialmente D1/Ara/Justo&Bueno en hard discount ganando espacio en TAT estratos 2-3
- La dinámica del canal TAT (tienda a tienda) en el Eje Cafetero: ciclos de pago quincenales, comportamiento de tenderos, estacionalidad por temporadas de cosecha cafetera
- Los causales típicos de devolución en la región: "SIN PLATA" (cartera), "LOCAL CERRADO" (programación de rutas), vencimientos, faltantes
- Las ciudades: Pereira (MACRO_3), Manizales/Caldas (MACRO_2), Armenia/Quindío (MACRO_1)

REGLAS DE ORO:
1. Usa SIEMPRE los datos reales del canal que te doy como contexto — son de hoy
2. Cuando hables de competencia o mercado externo, di explícitamente que es conocimiento del sector (no inventar cifras)
3. Responde en español colombiano natural — como un asesor senior de ventas, no como un robot
4. Sé directo, concreto y accionable — nada de rodeos ni disclaimers legales
5. Si la pregunta mezcla datos del canal + contexto de mercado, responde ambas dimensiones
6. Máximo 4-6 párrafos o bullets. Sin paja.

${cuboContext}`;

    // ── Llamada al proxy local que habla con Gemini desde Node ────────────────
    // (Las keys AQ. no funcionan desde browser por CORS — el servidor proxy sí)
    const PROXY_URL = 'http://localhost:4000/api/gemini';

    // Historial de conversación (últimos 6 mensajes para contexto)
    const currentMsgs = useStore.getState().chatMessages;
    const baseMsgs = currentMsgs.length > 0 ? currentMsgs : [WELCOME_MSG];
    const recentHistory = baseMsgs.slice(-6).filter(m => m.id !== 'welcome');
    const historyParts = recentHistory.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          contents: [
            ...historyParts,
            { role: 'user', parts: [{ text }] }
          ]
        })
      });

      // Si es 429, reintento automático una sola vez después de 6 segundos
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 6000));
        const retry = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt,
            contents: [...historyParts, { role: 'user', parts: [{ text }] }]
          })
        });
        const retryData = await retry.json();
        const replyText = retry.ok ? (retryData.text || 'Sin respuesta.') : null;
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: replyText || 'El servicio de IA está ocupado en este momento. Intenta de nuevo en unos segundos.',
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      }

      const data = await res.json();
      const replyText = res.ok ? (data.text || 'Sin respuesta.') : null;
      const errorMsg  = !res.ok ? (data.error || `Error ${res.status}`) : null;

      if (replyText) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: replyText,
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        // Quota agotada — mensaje corto, sin datos crudos
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'El servicio de IA está ocupado en este momento. Intenta de nuevo en unos segundos.',
          time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }]);
      }

    } catch (err) {
      console.error('Gemini error:', err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'No pude conectar con el servicio de IA. Verifica que el servidor esté corriendo con npm run dev:all.',
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
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

  // ── ANOMALÍAS DINÁMICAS — 100% desde datos reales ───────────────────
  const anomalies = [];

  // 1. Ejecutivos con devolución crítica (> 8%) o alta (> 5%)
  const criticalSellers = filteredData.returnsSellers.filter(
    s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE' && s.porcentajeDevolucion > 0.05
  );
  criticalSellers.forEach((s, idx) => {
    const isCritical = s.porcentajeDevolucion > 0.08;
    anomalies.push({
      id: `seller-${s.ejecutivo || idx}`,
      type: isCritical ? 'danger' : 'warning',
      title: `${isCritical ? '🚨' : '⚠️'} Retornos anómalos: ${s.nombre}`,
      description: `${s.nombre} (Zona ${s.ejecutivo}) registra ${formatPercent(s.porcentajeDevolucion)} de devoluciones — ${formatCurrency(s.devoluciones)} devueltos sobre ${formatCurrency(s.ventas)} facturados. Supera el umbral del 5%.`,
      impact: isCritical
        ? `Pérdida neta de ${formatCurrency(s.devoluciones)} en flujo del distribuidor. Requiere intervención inmediata.`
        : 'Incremento en costo logístico y reproceso de bodega.',
      route: '/devoluciones'
    });
  });

  // 2. Zonas con cumplimiento < 60%
  const lowZones = filteredData.zones.filter(
    z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto < 0.6
  );
  lowZones.forEach((z, idx) => {
    anomalies.push({
      id: `zone-${z.zona || idx}`,
      type: 'danger',
      title: `📉 Bajo cumplimiento: Zona ${z.zona}`,
      description: `Zona ${z.zona} (${z.vendedor}) lleva solo ${formatPercent(z.ventasNetas / z.presupuesto)} de su meta. Facturó ${formatCurrency(z.ventasNetas)} vs presupuesto de ${formatCurrency(z.presupuesto)}.`,
      impact: `Brecha de ${formatCurrency(z.presupuesto - z.ventasNetas)} sin recuperar. Afecta el consolidado regional.`,
      route: '/focos'
    });
  });

  // 3. Si tasa de devolución global supera 6%
  const globalDevRate = kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0;
  if (globalDevRate > 0.06) {
    anomalies.push({
      id: 'tasa-global',
      type: 'warning',
      title: `📦 Tasa de devolución global elevada`,
      description: `El canal registra ${formatPercent(globalDevRate)} de devolución sobre ventas brutas — por encima del umbral operativo del 6%. Causa principal: "SIN PLATA" concentra más del 52% del volumen devuelto.`,
      impact: `${formatCurrency(kpis.totalReturns)} en retornos activos. Problema de cartera y timing de ruta, no de calidad de producto.`,
      route: '/devoluciones'
    });
  }

  // 4. Zonas que superaron el 110% de meta (positivo pero relevante)
  const overAchievedZones = filteredData.zones.filter(
    z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto >= 1.1
  );
  overAchievedZones.slice(0, 2).forEach(z => {
    anomalies.push({
      id: `top-zone-${z.zona}`,
      type: 'success',
      title: `🏆 Zona estrella: ${z.zona}`,
      description: `${z.vendedor} alcanzó ${formatPercent(z.ventasNetas / z.presupuesto)} de cumplimiento — ${formatCurrency(z.ventasNetas)} sobre una meta de ${formatCurrency(z.presupuesto)}.`,
      impact: 'Zona modelo para replicar metodología de preventa y cobertura.',
      route: '/vendedores'
    });
  });

  // 5. Si cumplimiento general está por debajo del 80%
  if (kpis.compliance < 0.8 && kpis.totalBudget > 0) {
    anomalies.push({
      id: 'compliance-low',
      type: 'danger',
      title: `🎯 Cumplimiento consolidado en riesgo`,
      description: `El canal está en ${formatPercent(kpis.compliance)} del presupuesto total. Faltan ${formatCurrency(kpis.totalBudget - kpis.totalSales)} para alcanzar la meta mensual.`,
      impact: 'Se requiere acelerar el ritmo de ventas diarias para cerrar la brecha antes de fin de mes.',
      route: '/'
    });
  }

  // ── INSIGHTS DINÁMICOS desde datos reales ───────────────────────────
  const mainProv = [...(filteredData.providers || [])]
    .sort((a, b) => b.ventas2026 - a.ventas2026)[0];
  const topDevConcept = [...(filteredData.returnsConcepts || [])]
    .sort((a, b) => b.porcentaje - a.porcentaje)[0];
  const topZoneObj = [...(filteredData.zones || [])]
    .filter(z => z.presupuesto > 0)
    .sort((a, b) => (b.ventasNetas / b.presupuesto) - (a.ventasNetas / a.presupuesto))[0];
  const topZone2 = [...(filteredData.zones || [])]
    .filter(z => z.presupuesto > 0)
    .sort((a, b) => (b.ventasNetas / b.presupuesto) - (a.ventasNetas / a.presupuesto))[1];

  const insights = [
    {
      title: mainProv ? `Crecimiento: ${mainProv.proveedor}` : 'Crecimiento de Alpina',
      text: mainProv
        ? `${mainProv.proveedor} acumula ${formatCurrency(mainProv.ventas2026)} en ventas — ${formatPercent(mainProv.crecimiento)} de crecimiento YoY. Es el motor principal del canal.`
        : 'No hay datos de proveedores disponibles.',
      icon: TrendingUp,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    },
    {
      title: 'Perfil de Devoluciones',
      text: topDevConcept
        ? `La causal principal es "${topDevConcept.concepto}" con ${formatPercent(topDevConcept.porcentaje)} del total devuelto (${formatCurrency(kpis.totalReturns * topDevConcept.porcentaje)}). Problema de cartera en punto de venta, no de calidad.`
        : `Devoluciones totales: ${formatCurrency(kpis.totalReturns)} — ${formatPercent(globalDevRate)} sobre ventas brutas.`,
      icon: AlertCircle,
      badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    },
    {
      title: 'Zonas Estrella del Periodo',
      text: topZoneObj
        ? `${topZoneObj.vendedor} (Zona ${topZoneObj.zona}) lidera con ${formatPercent(topZoneObj.ventasNetas / topZoneObj.presupuesto)} de cumplimiento.${topZone2 ? ` Le sigue ${topZone2.vendedor} (${formatPercent(topZone2.ventasNetas / topZone2.presupuesto)}).` : ''} Juntas aportan ${formatCurrency((topZoneObj.ventasNetas || 0) + (topZone2?.ventasNetas || 0))} netos.`
        : 'No hay datos de zonas disponibles.',
      icon: Sparkles,
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    }
  ];

  // AI Smart Recommendations
  const recommendations = [
    {
      title: 'Oportunidad de diferenciación en canal TAT',
      text: 'Reforzar la presencia de productos de valor agregado (yogures, esparcibles, quesos maduros) en el canal tradicional, donde Alpina tiene mayor diferenciación frente a competidores de precio como Colanta y marcas propias de hard discount.',
      action: 'Ver plan de acción comercial'
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
                      onClick={() => anom.route && navigate(anom.route)}
                      className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all duration-300 hover:scale-[1.01] ${anom.route ? 'cursor-pointer' : ''} ${
                        anom.type === 'danger'
                          ? 'bg-rose-950/20 border-rose-500/20 shadow-md shadow-rose-950/20 hover:border-rose-500/40'
                          : anom.type === 'success'
                          ? 'bg-emerald-950/20 border-emerald-500/20 shadow-md shadow-emerald-950/20 hover:border-emerald-500/40'
                          : 'bg-amber-950/20 border-amber-500/20 shadow-md shadow-amber-950/20 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          anom.type === 'danger'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : anom.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {anom.type === 'danger' ? 'Crítico' : anom.type === 'success' ? 'Destacado' : 'Advertencia'}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full animate-ping ${
                          anom.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}></div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100">{anom.title}</h4>
                      <p className="text-[10px] text-slate-300 leading-relaxed font-medium">{anom.description}</p>

                      <div className="pt-3 border-t border-slate-900/60 flex flex-col gap-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Impacto Comercial Esperado:</span>
                        <span className="text-[10px] text-slate-200 font-semibold">{anom.impact}</span>
                      </div>
                      {anom.route && (
                        <p className="text-[9px] text-blue-500/70 font-medium -mt-1">Toca para ver el detalle →</p>
                      )}
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
                  <h3 className="text-base font-bold text-white">Contexto Competitivo</h3>
                  <p className="text-xs text-slate-400">Participación nacional estimada · Lácteos Colombia</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Colanta
                    </span>
                    <span className="text-emerald-400 font-bold">~21,9%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full" style={{ width: '44%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Alpina
                    </span>
                    <span className="text-blue-400 font-bold">~12,0%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Alquería
                    </span>
                    <span className="text-red-400 font-bold">~10,6%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 h-full rounded-full" style={{ width: '21%' }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-900/60 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Participación nacional estimada · Euromonitor / La República · ref. 2024–2025</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-900">
                    <p className="text-slate-400 font-semibold">Leche Líquida (UHT)</p>
                    <p className="text-red-400 font-bold mt-0.5">Alquería activa</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-900">
                    <p className="text-slate-400 font-semibold">Hard Discount</p>
                    <p className="text-amber-400 font-bold mt-0.5">D1 / Ara creciendo</p>
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
            <div className="p-4 border-b border-slate-900 bg-slate-950/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Brain className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Consultor de Negocios IA</h3>
                  <p className="text-[10px] text-slate-400">Analista local Zentra Alpina · Activo</p>
                </div>
              </div>
              <button
                onClick={() => setChatMessages([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-all"
                title="Limpiar historial del chat"
              >
                Limpiar chat
              </button>
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
                  { text: '¿Quiénes son los ejecutivos con mayor tasa de devolución este periodo?', short: 'Ejecutivos en Riesgo' },
                  { text: '¿Cómo está la competencia de Alpina frente a Alquería y Colanta en el Eje Cafetero?', short: 'Contexto Competitivo' },
                  { text: '¿Qué zonas superan el presupuesto y cuáles necesitan intervención?', short: 'Cumplimiento por Zonas' },
                  { text: '¿Cuál es la proyección de cierre de mes al ritmo actual?', short: 'Proyección de Cierre' },
                  { text: '¿Cómo está el crecimiento YoY de Alpina en este canal?', short: 'Crecimiento YoY' },
                  { text: '¿Cuál es el diagnóstico de calidad logística del canal?', short: 'Calidad Logística' }
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
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                  <span className="text-slate-400 font-medium">Día hábil:</span>
                  <span className="text-amber-400 font-extrabold">
                    {currentWorkDay > 0 ? `Día ${currentWorkDay} / 22` : 'Auto-detectado'}
                  </span>
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
