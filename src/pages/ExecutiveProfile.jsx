import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { getFilteredData, ZONA_CIUDAD_MAP, getDiasHabiles } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import {
  User, MapPin, TrendingUp, TrendingDown, DollarSign, 
  AlertCircle, ArrowLeft, Calendar, Package, CheckCircle2, XCircle
} from 'lucide-react';

const ExecutiveProfile = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dbData = useStore(state => state.dbData);
  const currentWorkDay = useStore(state => state.currentWorkDay);
  
  const sellerCode = searchParams.get('seller'); // Código del ejecutivo (zona)
  
  // Encontrar datos del ejecutivo
  const sellerData = useMemo(() => {
    if (!sellerCode) return null;
    const returnsSeller = (dbData.returnsSellers || []).find(s => s.ejecutivo === sellerCode);
    const zone = (dbData.zones || []).find(z => z.zona === sellerCode);
    
    if (!returnsSeller && !zone) return null;
    
    return {
      code: sellerCode,
      name: returnsSeller?.nombre || zone?.vendedor || sellerCode,
      zone: sellerCode,
      ciudad: ZONA_CIUDAD_MAP[sellerCode] || 'OTRO',
      ventas: returnsSeller?.ventas || zone?.ventasNetas || 0,
      devoluciones: returnsSeller?.devoluciones || 0,
      porcentajeDevolucion: returnsSeller?.porcentajeDevolucion || 0,
      presupuesto: zone?.presupuesto || 0,
      facturas: zone?.facturas || 0,
      proyectado: zone?.proyectado || 0
    };
  }, [sellerCode, dbData]);

  // Tendencia diaria de ventas del ejecutivo (estimación basada en datos disponibles)
  const dailyTrend = useMemo(() => {
    if (!sellerData || !dbData.salesDaily) return [];
    
    // Como no tenemos ventas diarias por ejecutivo, estimamos la distribución
    // basándonos en la proporción de sus ventas totales vs el total
    const totalSales = dbData.salesDaily.reduce((s, d) => s + (d.total || 0), 0);
    const sellerRatio = totalSales > 0 ? sellerData.ventas / totalSales : 0;
    
    return dbData.salesDaily
      .filter(d => d.fecha && d.fecha !== 'general')
      .map(d => ({
        fecha: d.fecha,
        ventas: Math.round(d.total * sellerRatio)
      }))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-15); // Últimos 15 días
  }, [sellerData, dbData.salesDaily]);

  // Clientes con mayor devolución FILTRADOS por este ejecutivo específico
  const topReturnClients = useMemo(() => {
    if (!dbData.clientReturns || !sellerCode) return [];
    
    // Filtrar solo clientes de este ejecutivo
    return dbData.clientReturns
      .filter(c => c.ejecutivo === sellerCode)
      .sort((a, b) => (b.valor || 0) - (a.valor || 0))
      .slice(0, 5);
  }, [dbData.clientReturns, sellerCode]);

  // Conceptos principales de devolución — calculados desde los clientes de ESTE ejecutivo
  const topReturnConcepts = useMemo(() => {
    if (!dbData.clientReturns || !sellerCode) return [];

    // Agrupar por concepto sumando los valores de este ejecutivo
    const conceptMap = {};
    dbData.clientReturns
      .filter(c => c.ejecutivo === sellerCode)
      .forEach(c => {
        const key = c.concepto || 'SIN CONCEPTO';
        conceptMap[key] = (conceptMap[key] || 0) + (c.valor || 0);
      });

    return Object.entries(conceptMap)
      .map(([concepto, total]) => ({ concepto, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [dbData.clientReturns, sellerCode]);

  if (!sellerCode) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Ejecutivo no especificado</h2>
        <p className="text-slate-600 text-sm mt-2">Usa el parámetro ?seller=codigo en la URL</p>
        <button
          onClick={() => navigate('/vendedores')}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-slate-900 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Vendedores
        </button>
      </div>
    );
  }

  if (!sellerData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Ejecutivo no encontrado</h2>
        <p className="text-slate-600 text-sm mt-2">Código: {sellerCode}</p>
        <button
          onClick={() => navigate('/vendedores')}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-slate-900 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Vendedores
        </button>
      </div>
    );
  }

  const compliance = sellerData.presupuesto > 0 ? sellerData.ventas / sellerData.presupuesto : 0;
  const isDevAlert = sellerData.porcentajeDevolucion > 0.05;
  
  const cityMeta = {
    PEREIRA: { label: 'Eje Pereira', color: 'blue' },
    MANIZALES: { label: 'Eje Caldas', color: 'indigo' },
    ARMENIA: { label: 'Eje Quindío', color: 'emerald' }
  }[sellerData.ciudad] || { label: 'Otro', color: 'slate' };

  // Chart de tendencia diaria
  const chartSeries = [{
    name: 'Ventas',
    data: dailyTrend.map(d => d.ventas)
  }];
  
  const chartOptions = {
    chart: {
      type: 'area',
      background: 'transparent',
      foreColor: '#94a3b8',
      toolbar: { show: false },
      sparkline: { enabled: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#3b82f6'],
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: dailyTrend.map(d => {
        const dt = new Date(d.fecha);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
      }),
      labels: { style: { fontSize: '10px' } }
    },
    yaxis: {
      labels: { formatter: v => formatShortCurrency(v) }
    },
    grid: { borderColor: '#1e293b' },
    tooltip: {
      theme: 'dark',
      y: { formatter: v => formatCurrency(v) }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/vendedores')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100/60 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Volver</span>
        </button>
      </div>

      {/* Perfil del ejecutivo */}
      <GlassCard hoverable={false} className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br from-${cityMeta.color}-500/10 to-transparent opacity-30 pointer-events-none rounded-2xl`} />
        <div className="relative flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-${cityMeta.color}-600 to-${cityMeta.color}-800 flex items-center justify-center shrink-0 shadow-lg`}>
            <User className="h-12 w-12 text-slate-900" />
          </div>
          
          {/* Info básica */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{sellerData.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-${cityMeta.color}-500/10 text-${cityMeta.color}-400 border-${cityMeta.color}-500/20`}>
                  <MapPin className="h-3 w-3" />
                  {cityMeta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">
                  Zona {sellerData.zone}
                </span>
              </div>
            </div>
            
            {/* Stats inline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Ventas Acumuladas</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{formatShortCurrency(sellerData.ventas)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Cumplimiento</p>
                <p className={`text-lg font-bold mt-0.5 ${compliance >= 1 ? 'text-emerald-400' : compliance >= 0.8 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {formatPercent(compliance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Devoluciones</p>
                <p className={`text-lg font-bold mt-0.5 ${isDevAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {formatPercent(sellerData.porcentajeDevolucion)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Facturas</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{sellerData.facturas.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Alerta de devolución crítica */}
      {isDevAlert && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/5 animate-pulse">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300 font-medium">
            <strong>Alerta:</strong> La tasa de devoluciones supera el umbral crítico del 5%. Se requiere acción inmediata.
          </p>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard hoverable={false} className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Presupuesto</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{formatShortCurrency(sellerData.presupuesto)}</p>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Proyectado</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{formatShortCurrency(sellerData.proyectado)}</p>
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isDevAlert ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Devoluciones</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{formatShortCurrency(sellerData.devoluciones)}</p>
          </div>
        </GlassCard>
      </div>

      {/* Tendencia de ventas diarias */}
      <GlassCard hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Tendencia de Ventas Diarias</h3>
          <span className="text-[10px] text-slate-600 font-medium">Últimos 15 días</span>
        </div>
        <Chart options={chartOptions} series={chartSeries} type="area" height={240} />
      </GlassCard>

      {/* Clientes y conceptos de devolución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clientes con devolución */}
        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900">Clientes con Mayor Devolución</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topReturnClients.map((client, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{client.cliente}</h4>
                  <p className="text-[10px] text-slate-600 mt-0.5">{client.concepto}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-rose-600">{formatShortCurrency(client.valor)}</span>
                </div>
              </div>
            ))}
            {topReturnClients.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center py-8">Sin datos de clientes disponibles.</p>
            )}
          </div>
        </GlassCard>

        {/* Conceptos principales de devolución */}
        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Conceptos de Devolución</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topReturnConcepts.map((concept, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate flex-1">{concept.concepto}</h4>
                  <span className="text-sm font-bold text-amber-700">{formatShortCurrency(concept.total)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                    style={{ width: `${Math.min((concept.total / (topReturnConcepts[0]?.total || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {topReturnConcepts.length === 0 && (
              <p className="text-xs text-slate-600 italic text-center py-8">Sin conceptos de devolución disponibles.</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Info adicional */}
      <GlassCard hoverable={false}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900">Información del Periodo</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-[10px] text-slate-600 uppercase">Día Hábil Actual</p>
            <p className="text-lg font-bold text-blue-400 mt-1">{currentWorkDay > 0 ? currentWorkDay : 'Auto'} / {getDiasHabiles(useStore.getState().selectedPeriod)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase">Ticket Promedio</p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {sellerData.facturas > 0 ? formatShortCurrency(sellerData.ventas / sellerData.facturas) : '-'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase">Calidad de Entrega</p>
            <p className={`text-lg font-bold mt-1 ${isDevAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatPercent(1 - sellerData.porcentajeDevolucion)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 uppercase">Estado</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {compliance >= 1 ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">Cumplido</span></>
              ) : compliance >= 0.8 ? (
                <><AlertCircle className="h-4 w-4 text-amber-400" /><span className="text-sm font-bold text-amber-400">En Riesgo</span></>
              ) : (
                <><XCircle className="h-4 w-4 text-rose-400" /><span className="text-sm font-bold text-rose-400">Crítico</span></>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default ExecutiveProfile;
