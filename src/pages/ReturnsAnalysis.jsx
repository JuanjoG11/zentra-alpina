import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIHeatmapChart, BIRadarChart, BIFunnelChart } from '../components/charts/BICharts';
import { AlertOctagon, TrendingDown, Users, ShieldAlert, MapPin, Percent } from 'lucide-react';

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

  // Group returns by client to find critical ones (general returns only)
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

  // Group expiry returns by client
  const expiryClientAgg = {};
  filteredData.expiryClientReturns.forEach(c => {
    if (!expiryClientAgg[c.cliente]) {
      expiryClientAgg[c.cliente] = { cliente: c.cliente, totalReturn: 0, ejecutivo: c.ejecutivo, count: 0 };
    }
    expiryClientAgg[c.cliente].totalReturn += c.valor;
    expiryClientAgg[c.cliente].count += 1;
  });

  const criticalExpiryClients = Object.values(expiryClientAgg)
    .sort((a, b) => b.totalReturn - a.totalReturn)
    .slice(0, 10);

  // Calculate concept summary and total (general returns)
  const sortedConcepts = [...filteredData.returnsConcepts]
    .sort((a, b) => b.porcentaje - a.porcentaje);

  // Calculate expiry concept summary and total
  const sortedExpiryConcepts = [...filteredData.expiryConcepts]
    .sort((a, b) => b.porcentaje - a.porcentaje);
    
  // Rechazos: suma directa de clientReturns
  const totalGeneralReturns = filteredData.clientReturns.reduce((sum, c) => sum + (c.valor || 0), 0);

  // Cambios (vencimientos): expiryDaily si disponible, sino diferencia
  const expiryDailySum = filteredData.expiryDaily.reduce((sum, r) => sum + (r.devoluciones || 0), 0);
  const returnsDailySum = filteredData.returnsDaily.reduce((sum, r) => sum + (r.devoluciones || 0), 0);
  const totalExpiryReturns = expiryDailySum > 0
    ? expiryDailySum
    : Math.max(0, returnsDailySum - totalGeneralReturns);

  // Total devolución: usar la misma fuente fiable que el Dashboard (bruto - neto de zonas)
  // kpis.totalReturns = totalSales - zonesNetSum, siempre consistente entre dispositivos
  const totalAllReturns = kpis.totalReturns > 0 ? kpis.totalReturns : totalGeneralReturns + totalExpiryReturns;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Análisis de Devoluciones</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Identifique causas de devoluciones, impacto financiero en margen y mapee vendedores o clientes críticos.
        </p>
      </div>

      {/* Returns KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Rechazos Valor */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Rechazos</p>
            <h3 className="text-2xl font-bold text-orange-500 mt-1">{formatCurrency(totalGeneralReturns)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Total motivos excepto M.E.</p>
          </div>
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Tasa de Rechazos */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tasa de Rechazo</p>
            <h3 className="text-2xl font-bold text-amber-500 mt-1">
              {formatPercent(kpis.totalSales > 0 ? totalGeneralReturns / kpis.totalSales : 0)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Porcentaje sobre ventas brutas</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Cambios Valor */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Cambios</p>
            <h3 className="text-2xl font-bold text-rose-500 mt-1">{formatCurrency(totalExpiryReturns)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Motivos tipo "M.E." (vencimientos)</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Tasa de Cambios */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tasa de Cambios</p>
            <h3 className="text-2xl font-bold text-pink-500 mt-1">
              {formatPercent(kpis.totalSales > 0 ? totalExpiryReturns / kpis.totalSales : 0)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Porcentaje sobre ventas brutas</p>
          </div>
          <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl">
            <Percent className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Total Devoluciones */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-slate-900/20 border-slate-800">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Devolución</p>
            <h3 className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalAllReturns)}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Tasa total: {formatPercent(kpis.totalSales > 0 ? totalAllReturns / kpis.totalSales : 0)}</p>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <TrendingDown className="h-6 w-6" />
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
            <h3 className="text-base font-bold text-white">Clientes Críticos por Rechazos</h3>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[420px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3 text-center hidden sm:table-cell">Ejecutivo</th>
                  <th className="pb-3 text-center hidden md:table-cell">Eje</th>
                  <th className="pb-3 text-right">Devuelto</th>
                  <th className="pb-3 text-right pr-2 hidden sm:table-cell">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {criticalClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 font-semibold text-slate-200 truncate max-w-[160px]" title={client.cliente}>
                      {client.cliente}
                    </td>
                    <td className="py-3 text-center text-slate-400 font-mono text-[10px] hidden sm:table-cell">{client.ejecutivo}</td>
                    <td className="py-3 text-center hidden md:table-cell"><CityBadge zona={client.ejecutivo} /></td>
                    <td className="py-3 text-right font-bold text-rose-400">{formatShortCurrency(client.totalReturn)}</td>
                    <td className="py-3 text-right text-slate-300 pr-4 hidden sm:table-cell">{client.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Concept Breakdown list */}
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-white mb-4">Métricas por Concepto (Rechazos)</h3>
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
                      className="bg-orange-500 h-full rounded-full" 
                      style={{ width: `${item.porcentaje * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Sección de Cambios */}
      {totalExpiryReturns > 0 && (
        <>
          <div className="mt-8 pt-8 border-t border-slate-800">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Cambios por M.E.</h2>
            <p className="text-slate-400 text-sm">
              Análisis específico de devoluciones que corresponden a Cambios por M.E.
            </p>
          </div>

          {/* Expiry Clients & Concepts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Expiry Clients Table */}
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold text-white">Clientes Críticos por Cambios</h3>
              </div>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[420px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3 text-center hidden sm:table-cell">Ejecutivo</th>
                      <th className="pb-3 text-center hidden md:table-cell">Eje</th>
                      <th className="pb-3 text-right">Devuelto</th>
                      <th className="pb-3 text-right pr-2 hidden sm:table-cell">Registros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {criticalExpiryClients.length > 0 ? criticalExpiryClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 font-semibold text-slate-200 truncate max-w-[160px]" title={client.cliente}>
                          {client.cliente}
                        </td>
                        <td className="py-3 text-center text-slate-400 font-mono text-[10px] hidden sm:table-cell">{client.ejecutivo}</td>
                        <td className="py-3 text-center hidden md:table-cell"><CityBadge zona={client.ejecutivo} /></td>
                        <td className="py-3 text-right font-bold text-rose-600">{formatShortCurrency(client.totalReturn)}</td>
                        <td className="py-3 text-right text-slate-300 pr-4 hidden sm:table-cell">{client.count}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-500 text-sm">
                          No hay datos de clientes con cambios por M.E.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Expiry Concept Breakdown list */}
            <GlassCard hoverable={false}>
              <h3 className="text-base font-bold text-white mb-4">Métricas por Concepto (Cambios)</h3>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                {sortedExpiryConcepts.length > 0 ? sortedExpiryConcepts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/30 border border-slate-900">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{item.concepto}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tasa representativa</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-100">{formatPercent(item.porcentaje)}</span>
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="bg-rose-600 h-full rounded-full" 
                          style={{ width: `${item.porcentaje * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-slate-500 text-sm py-6">
                    No hay conceptos de cambios registrados
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default ReturnsAnalysis;
