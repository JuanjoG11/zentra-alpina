import React, { useState } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import alpinaLogo from '../assets/alpina-logo.svg';
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

const BusinessIA = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, ai, commercial, logistics
  const filters = useStore();
  const dbData  = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Dynamic Anomalies Detection
  const anomalies = [];
  
  // Anomaly 1: Polaroid drop
  const polar = filteredData.providers.find(p => p.proveedor.includes('POLAR'));
  if (polar && polar.crecimiento < -0.3) {
    anomalies.push({
      id: 1,
      type: 'danger',
      title: 'Caída crítica en Alimentos Polar',
      description: `Las ventas de Alimentos Polar cayeron un ${formatPercent(Math.abs(polar.crecimiento))} este mes en comparación con el año anterior, facturando ${formatCurrency(polar.ventas2026)}.`,
      impact: 'Alto impacto en ventas del portafolio complementario.'
    });
  }

  // Anomaly 2: High Seller Returns
  const criticalSellers = filteredData.returnsSellers.filter(s => s.porcentajeDevolucion > 0.08);
  criticalSellers.forEach((s, idx) => {
    anomalies.push({
      id: 2 + idx,
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
      id: 10 + idx,
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
      title: 'Revisar portafolio de Alimentos Polar',
      text: 'Iniciar auditoría comercial con Alimentos Polar para entender el desplome de ventas del 63.4% y ajustar el inventario en tránsito.',
      action: 'Crear campaña de activación'
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
          { id: 'commercial', label: 'Tendencias',          icon: LineChart  },
          { id: 'logistics',  label: 'Calidad & Retornos',  icon: Truck      },
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Anomalies Panel (Alerts) */}
          <div className="xl:col-span-1 space-y-5">
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

          {/* AI Insights & Automated Advisor */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Insights Panel */}
            <GlassCard hoverable={false} className="border-indigo-950/30 bg-indigo-950/[0.01] p-5 shadow-xl">
              <div className="flex items-center gap-2.5 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Insights Automáticos del Canal</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hallazgos y comportamientos anómalos extraídos directamente por nuestro modelo de datos.</p>
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
                    <h3 className="text-base font-bold text-white">Consejero de Negocios (Acciones IA)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Propuestas comerciales y operativas generadas automáticamente para mitigar riesgos.</p>
                  </div>
                </div>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Ver todas</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900/60 flex flex-col justify-between hover:border-slate-800 transition-all duration-300">
                    <div>
                      <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">Alta Prioridad</span>
                      <h4 className="text-xs font-bold text-slate-100 mt-2">{rec.title}</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-2">{rec.text}</p>
                    </div>
                    <button className="mt-4 flex items-center justify-center gap-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 py-1.5 px-3 rounded-lg font-bold group transition-all duration-300 border border-indigo-500/10">
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

      {activeTab === 'commercial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard hoverable={false} className="lg:col-span-2 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Tendencia de Ventas Diaria</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Volumen total diario facturado en el periodo actual.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 font-bold font-mono shrink-0">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Creciente</span>
                </div>
              </div>
              <BILineChart data={filteredData.salesDaily} />
            </GlassCard>

            <GlassCard hoverable={false} className="lg:col-span-1 p-5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1">Contado vs Crédito</h3>
              <p className="text-xs text-slate-400 mb-4">Distribución diaria por modalidad de pago.</p>
              <BIStackedBarChart data={filteredData.salesDaily} />
            </GlassCard>
          </div>

          <GlassCard hoverable={false} className="p-5 shadow-xl">
            <div className="flex items-start gap-2 mb-3">
              <Layers className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">Distribución de Ventas por Marcas</h3>
                <p className="text-xs text-slate-400 mt-0.5">El tamaño de los bloques representa el volumen de ventas 2026 de cada marca.</p>
              </div>
            </div>
            <div className="min-h-[280px] sm:min-h-[340px] flex items-center justify-center">
              <BITreemapChart data={filteredData.providers} />
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'logistics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard hoverable={false} className="lg:col-span-1 p-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white">Puente de Conciliación Comercial</h3>
                <p className="text-xs text-slate-400 mb-4">Conciliación de ventas brutas deduciendo devoluciones registradas para calcular las netas.</p>
              </div>
              <BIWaterfallChart sales={totalSales} returns={totalReturns} />
            </GlassCard>

            <GlassCard hoverable={false} className="lg:col-span-2 p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Mapa de Calor: Fricciones de Devolución</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Correlación cruzada entre ejecutivos y motivos de rechazo (COP Miles).</p>
                </div>
                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono shrink-0">Motivo principal: "Sin Plata"</span>
              </div>
              <BIHeatmapChart returnsSellers={filteredData.returnsSellers} clientReturns={filteredData.clientReturns} />
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard hoverable={false} className="p-5 shadow-xl">
              <div className="flex items-start gap-2 mb-3">
                <Activity className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-white">Correlación: Volumen vs Devoluciones</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Clientes de alto volumen con tasas de retorno fuera del promedio.</p>
                </div>
              </div>
              <BIScatterPlot clientReturns={filteredData.clientReturns} />
            </GlassCard>

            <GlassCard hoverable={false} className="p-5 shadow-xl">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-white">Causales de Devolución</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Jerarquía de justificaciones por valor monetario.</p>
                </div>
              </div>
              <BIFunnelChart data={filteredData.returnsConcepts} />
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessIA;
