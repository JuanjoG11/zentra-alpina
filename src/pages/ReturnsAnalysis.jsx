import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIHeatmapChart, BIRadarChart, BIFunnelChart } from '../components/charts/BICharts';
import { AlertOctagon, TrendingDown, Users, ShieldAlert, MapPin } from 'lucide-react';

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',  bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  MANIZALES: { label: 'Eje Caldas',   bg: 'bg-indigo-500/10',  text: 'text-indigo-400'  },
  ARMENIA:   { label: 'Eje Quindío',  bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  OTRO:      { label: 'Otro',         bg: 'bg-slate-500/10',   text: 'text-slate-400'   },
};

const CityBadge = ({ zona }) => {
  const city = ZONA_CIUDAD_MAP[zona] || 'OTRO';
  const meta = CITY_META[city] || CITY_META.OTRO;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${meta.bg} ${meta.text}`}>
      <MapPin className="h-2.5 w-2.5" />{meta.label}
    </span>
  );
};

const ReturnsAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  // Group returns by client to find critical ones
  const clientAgg = {};
  filteredData.clientReturns.forEach(c => {
    if (!clientAgg[c.cliente]) {
      clientAgg[c.cliente] = { cliente: c.cliente, totalReturn: 0, ejecutivo: c.ejecutivo, count: 0 };
    }
    clientAgg[c.cliente].totalReturn += c.valor;
    clientAgg[c.cliente].count += 1;
  });

  const criticalClients = Object.values(clientAgg)
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .slice(0, 10);

  // Calculate concept summary and total
  const sortedConcepts = [...filteredData.returnsConcepts]
    .sort((a, b) => b.porcentaje - a.porcentaje);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de Devoluciones</h1>
        <p className="text-slate-400 text-sm mt-1">
          Identifique causas de devoluciones, impacto financiero en margen y mapee vendedores o clientes críticos.
        </p>
      </div>

      {/* Returns KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pérdidas Totales (Devolución)</p>
            <h3 className="text-2xl font-bold text-rose-500 mt-1">{formatCurrency(kpis.totalReturns)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Monto total devuelto sin IVA</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tasa de Devolución %</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">{formatPercent(kpis.totalReturns / kpis.totalSales)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Porcentaje sobre ventas brutas</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
        </GlassCard>

        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vendedores Evaluados</p>
            <h3 className="text-2xl font-bold text-blue-500 mt-1">{filteredData.returnsSellers.length}</h3>
            <p className="text-[10px] text-slate-500 mt-1">En el canal Tiendas y Marcas</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </GlassCard>
      </div>

      {/* Heatmap Section */}
      <GlassCard hoverable={false}>
        <h3 className="text-base font-bold text-white mb-2">Matriz de Devoluciones por Vendedor y Concepto</h3>
        <p className="text-xs text-slate-400 mb-4">
          Visualice qué conceptos específicos representan la mayor pérdida por cada ejecutivo comercial (Cifras en Miles COP).
        </p>
        <BIHeatmapChart 
          returnsSellers={filteredData.returnsSellers} 
          clientReturns={filteredData.clientReturns} 
        />
      </GlassCard>

      {/* Radar Comparison and Concepts Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Radar de Desempeño y Calidad (Top Vendedores)</h3>
          <BIRadarChart returnsSellers={filteredData.returnsSellers} />
          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed text-center">
            Calidad representa 100% menos la tasa de devolución. A mayor calidad, menores pérdidas logísticas.
          </p>
        </GlassCard>

        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Distribución por Causa Principal</h3>
          <BIFunnelChart data={filteredData.returnsConcepts} />
        </GlassCard>
      </div>

      {/* Critical Clients & Concept Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Clients Table */}
        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h3 className="text-base font-bold text-white">Clientes Críticos por Devoluciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-semibold">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3 text-center">Ejecutivo</th>
                  <th className="pb-3 text-center">Eje</th>
                  <th className="pb-3 text-right">Devuelto sin IVA</th>
                  <th className="pb-3 text-right">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {criticalClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 font-semibold text-slate-200 truncate max-w-[180px]" title={client.cliente}>
                      {client.cliente}
                    </td>
                    <td className="py-3 text-center text-slate-400 font-mono text-[10px]">{client.ejecutivo}</td>
                    <td className="py-3 text-center"><CityBadge zona={client.ejecutivo} /></td>
                    <td className="py-3 text-right font-bold text-rose-400">{formatCurrency(client.totalReturn)}</td>
                    <td className="py-3 text-right text-slate-300 pr-4">{client.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Concept Breakdown list */}
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Métricas por Concepto</h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
            {sortedConcepts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/30 border border-slate-900">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{item.concepto}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tasa representativa</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-100">{formatPercent(item.porcentaje)}</span>
                  <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${item.porcentaje * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ReturnsAnalysis;
