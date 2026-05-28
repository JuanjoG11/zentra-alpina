import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';
import { formatCurrency, formatPercent } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIScatterPlot } from '../components/charts/BICharts';
import { 
  Brain, 
  Sparkles, 
  AlertTriangle, 
  Lightbulb, 
  LineChart,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const BusinessIA = () => {
  const filters = useStore();
  const filteredData = getFilteredData(filters);
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
      badgeColor: 'bg-emerald-500/10 text-emerald-400'
    },
    {
      title: 'Comportamiento de Devoluciones',
      text: `La causa principal de devoluciones es "SIN PLATA" con un 52,25%, seguida de "CERRADO" con 11,49%. Esto sugiere que el problema es de liquidez o cobranza en el punto de venta, no de calidad de producto.`,
      icon: AlertCircle,
      badgeColor: 'bg-blue-500/10 text-blue-400'
    },
    {
      title: 'Análisis de Zonas Estrella',
      text: `La zona M9458 alcanzó el 111,8% de cumplimiento de meta y la zona M9450 un 110,5%. Ambas zonas aportan conjuntamente ${formatCurrency(167213451)} netos.`,
      icon: Sparkles,
      badgeColor: 'bg-indigo-500/10 text-indigo-400'
    }
  ];

  // AI Smart Recommendations
  const recommendations = [
    {
      title: 'Revisar portafolio de Alimentos Polar',
      text: 'Iniciar auditoría comercial con Alimentos Polar para entender el desplome de ventas del 63.4% y ajustar el inventario en tránsito.',
      action: 'Crear campaña de activación comercial'
    },
    {
      title: 'Intervención en Ruta y Pedidos (Sandra M. García)',
      text: 'Capacitar al ejecutivo M9553 en toma de pedidos e inspección de locales debido a que registra 11.4% de devoluciones, mayormente por locales cerrados y sin dinero.',
      action: 'Asignar supervisor de acompañamiento'
    },
    {
      title: 'Revisión de presupuesto de la zona E7001',
      text: 'Evaluar si el presupuesto asignado a la zona E7001 ($15,718,970) es realista o si existen problemas de desabastecimiento, dado su 47.1% de cumplimiento.',
      action: 'Ajustar meta comercial de Mayo'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">IA Empresarial Alpina</h1>
          <p className="text-slate-400 text-sm mt-1">
            Módulo predictivo con detección de anomalías operativas, insights automáticos y recomendaciones de negocio.
          </p>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Insights Panel */}
        <div className="lg:col-span-2 space-y-5">
          <GlassCard hoverable={false} className="border-indigo-950/40 bg-indigo-950/[0.01]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Insights Automáticos</h3>
            </div>
            
            <div className="space-y-4">
              {insights.map((ins, idx) => {
                const Icon = ins.icon;
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex items-start gap-4 hover:border-indigo-500/20 transition-all duration-300">
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

          {/* Recommendations Panel */}
          <GlassCard hoverable={false}>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Recomendaciones de Negocio</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/20 border border-slate-850 flex flex-col justify-between hover:border-slate-750 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{rec.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-2">{rec.text}</p>
                  </div>
                  <button className="mt-4 flex items-center gap-1 text-[10px] text-blue-400 font-bold hover:text-blue-300 group">
                    <span>{rec.action}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Anomalies Panel */}
        <div className="space-y-5">
          <GlassCard hoverable={false} className="border-rose-950/40 bg-rose-950/[0.01]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-rose-500 animate-bounce" />
              <h3 className="text-base font-bold text-white">Anomalías Detectadas</h3>
            </div>
            
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              {anomalies.map((anom) => (
                <div 
                  key={anom.id} 
                  className={`p-3 rounded-2xl border flex flex-col gap-2 ${
                    anom.type === 'danger'
                      ? 'bg-rose-950/10 border-rose-500/10'
                      : 'bg-amber-950/10 border-amber-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      anom.type === 'danger'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {anom.type === 'danger' ? 'Crítico' : 'Alerta'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200">{anom.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">{anom.description}</p>
                  <div className="pt-2 border-t border-slate-900 flex flex-col gap-0.5">
                    <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Impacto esperado</span>
                    <span className="text-[10px] text-slate-300 font-medium">{anom.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Scatter plot visual correlation */}
      <GlassCard hoverable={false}>
        <div className="flex items-center gap-2 mb-2">
          <LineChart className="h-5 w-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">Análisis de Dispersión: Volumen de Compra vs Tasa de Devolución</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Identifique si los clientes de mayor volumen de facturación exhiben un porcentaje de devoluciones proporcionalmente mayor (Distribución de Clientes).
        </p>
        <BIScatterPlot clientReturns={filteredData.clientReturns} />
      </GlassCard>
    </div>
  );
};

export default BusinessIA;
