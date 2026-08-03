import React from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { BIHeatmapChart, BIRadarChart, BIFunnelChart } from '../components/charts/BICharts';
import { AlertOctagon, TrendingDown, Users, ShieldAlert, MapPin, Percent, Search } from 'lucide-react';
import { alpinaData } from '../data/alpina-data';

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',  bg: 'bg-blue-50 border border-blue-200',    text: 'text-blue-700'    },
  MANIZALES: { label: 'Eje Caldas',   bg: 'bg-indigo-50 border border-indigo-200',  text: 'text-indigo-700'  },
  ARMENIA:   { label: 'Eje Quindío',  bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700' },
  OTRO:      { label: 'Otro',         bg: 'bg-slate-100 border border-slate-200',   text: 'text-slate-600'   },
};

const CityBadge = ({ zona }) => {
  const city = ZONA_CIUDAD_MAP[zona] || 'OTRO';
  const meta = CITY_META[city] || CITY_META.OTRO;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${meta.bg} ${meta.text}`}>
      <MapPin className="h-2.5 w-2.5" />{meta.label}
    </span>
  );
};

const ReturnsAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);
  const kpis = calculateKPIs(filteredData);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortField, setSortField] = React.useState('ejecutivo');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [canalFilter, setCanalFilter] = React.useState('TODOS'); // 'TODOS' | 'TAT' | 'SUPER'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'ejecutivo' || field === 'nombre' ? 'asc' : 'desc');
    }
  };

  const SUPER_ZONES_SET = new Set(['M9450','M9451','M9550','M9560','M9600','P7000','P7001','P7002','P7008','P7009','P7010']);

  // Total devolución y desglose de Rechazos vs Cambios (M.E.)
  const OFFICIAL_RECHAZOS = 90481617;
  const OFFICIAL_CAMBIOS  = 63548095;
  const OFFICIAL_TOTAL    = OFFICIAL_RECHAZOS + OFFICIAL_CAMBIOS;
  const OFFICIAL_RECHAZOS_RATIO = OFFICIAL_RECHAZOS / OFFICIAL_TOTAL;

  const hasActiveFilter = (filters.selectedCity && filters.selectedCity !== 'Todas') ||
                         (filters.selectedZone && filters.selectedZone !== 'Todas') ||
                         (filters.selectedSeller && filters.selectedSeller !== 'Todas') ||
                         (filters.selectedProvider && filters.selectedProvider !== 'Todas');

  const rawClientSum = (filteredData.clientReturns || []).reduce((sum, c) => sum + (c.valor || 0), 0);
  const rawExpirySum = (filteredData.expiryClientReturns || []).reduce((sum, c) => sum + (c.valor || 0), 0);

  // Misma fuente que execsData: datos reales del cubo
  const _sellersSource = filteredData.returnsSellers || [];
  const rawSellersRechazos = _sellersSource.reduce((sum, s) => sum + (Number(s.rechazos) || 0), 0);
  const rawSellersCambios  = _sellersSource.reduce((sum, s) => sum + (Number(s.cambios) || 0), 0);
  const rawSellersDev      = _sellersSource.reduce((sum, s) => sum + (Number(s.devoluciones) || 0), 0);

  // Ventas brutas para calcular las tasas — misma fuente que la tabla
  const totalSalesForRate = _sellersSource.reduce((sum, s) => sum + (Number(s.ventasBrutas) || Number(s.ventas) || 0), 0)
    || kpis.totalSales
    || 0;

  let totalAllReturns = 0;
  let totalGeneralReturns = 0;  // rechazos (sin M.E.)
  let totalExpiryReturns = 0;   // cambios (M.E. vencimientos)

  // Fuente principal: returnsSellers con rechazos y cambios separados
  if (rawSellersDev > 0) {
    totalAllReturns = rawSellersDev;
    if (rawSellersCambios > 0 || (rawSellersRechazos > 0 && rawSellersRechazos < rawSellersDev)) {
      // Tenemos datos reales separados de rechazos vs cambios
      totalGeneralReturns = rawSellersRechazos;
      totalExpiryReturns = rawSellersCambios > 0 ? rawSellersCambios : Math.max(0, rawSellersDev - rawSellersRechazos);
    } else {
      // No hay separación en sellers (datos viejos sin columna rechazos)
      // Usar clientReturns/expiryClientReturns si AMBOS están disponibles
      if (rawClientSum > 0 && rawExpirySum > 0) {
        const partialTotal = rawClientSum + rawExpirySum;
        const rechazosRatio = rawClientSum / partialTotal;
        totalGeneralReturns = Math.round(rawSellersDev * rechazosRatio);
        totalExpiryReturns = rawSellersDev - totalGeneralReturns;
      } else {
        // Fallback: usar ratio oficial (58.74% Rechazos, 41.26% Cambios)
        totalGeneralReturns = Math.round(rawSellersDev * OFFICIAL_RECHAZOS_RATIO);
        totalExpiryReturns = rawSellersDev - totalGeneralReturns;
      }
    }
  } else if (rawClientSum > 0 || rawExpirySum > 0) {
    totalGeneralReturns = rawClientSum;
    totalExpiryReturns = rawExpirySum;
    totalAllReturns = totalGeneralReturns + totalExpiryReturns;
  } else {
    totalGeneralReturns = 0;
    totalExpiryReturns = 0;
    totalAllReturns = 0;
  }

  // Rechazos por ejecutivo provenientes de clientReturns si están disponibles
  const sellerRechazosFromClients = React.useMemo(() => {
    const map = {};
    (filteredData.clientReturns || []).forEach(c => {
      if (c.ejecutivo) {
        map[c.ejecutivo] = (map[c.ejecutivo] || 0) + (Number(c.valor) || 0);
      }
    });
    return map;
  }, [filteredData.clientReturns]);

  const execsData = React.useMemo(() => {
    const list = filteredData.returnsSellers || [];
    const hasRealData = list.length > 0;
    const rawSellersDevSum = list.reduce((sum, s) => sum + (Number(s.devoluciones) || 0), 0);
    const sellerScale = 1;
    // Detectar si los sellers ya tienen rechazos separados (columna DB o campo calculado)
    const sellersHaveRechazos = list.some(s => {
      const r = Number(s.rechazos) || 0;
      const d = Number(s.devoluciones) || 0;
      return r > 0 && r < d;  // rechazos existe y es menor que devoluciones totales
    });
    const rechazosRatio = totalAllReturns > 0 ? totalGeneralReturns / totalAllReturns : OFFICIAL_RECHAZOS_RATIO;

    return list.map(s => {
      const bruto = Number(s.ventasBrutas) || Number(s.ventas) || 0;
      const dev   = Math.round((Number(s.devoluciones) || 0) * sellerScale);
      const canal = s.canal || (SUPER_ZONES_SET.has(s.ejecutivo) ? 'SUPER' : 'TAT');
      // Usar rechazos directamente si están disponibles, sino aplicar ratio
      const rechazos = sellersHaveRechazos
        ? Math.round((Number(s.rechazos) || 0) * sellerScale)
        : Math.round(dev * rechazosRatio);

      return {
        ejecutivo: s.ejecutivo || '',
        nombre: s.nombre || 'Sin Asignar',
        canal,
        ventas: bruto,
        devoluciones: dev,
        rechazos,
      };
    });
  }, [filteredData.returnsSellers, totalGeneralReturns, totalAllReturns, hasActiveFilter]);

  const filteredExecs = React.useMemo(() => {
    let result = execsData;
    if (canalFilter !== 'TODOS') result = result.filter(e => e.canal === canalFilter);
    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(e =>
      e.ejecutivo.toLowerCase().includes(term) ||
      e.nombre.toLowerCase().includes(term)
    );
  }, [execsData, searchTerm, canalFilter]);

  const sortedExecs = React.useMemo(() => {
    return [...filteredExecs].sort((a, b) => {
      let comp = 0;
      if (sortField === 'ejecutivo') {
        comp = a.ejecutivo.localeCompare(b.ejecutivo, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'nombre') {
        comp = a.nombre.localeCompare(b.nombre);
      } else if (sortField === 'ventas') {
        comp = a.ventas - b.ventas;
      } else if (sortField === 'rechazos') {
        comp = a.rechazos - b.rechazos;
      } else if (sortField === 'porcentaje') {
        const rA = a.ventas > 0 ? a.rechazos / a.ventas : 0;
        const rB = b.ventas > 0 ? b.rechazos / b.ventas : 0;
        comp = rA - rB;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredExecs, sortField, sortOrder]);

  const totalsExecs = React.useMemo(() => {
    const ventas    = filteredExecs.reduce((sum, e) => sum + e.ventas, 0);
    const rechazos  = filteredExecs.reduce((sum, e) => sum + e.rechazos, 0);
    const devoluciones = filteredExecs.reduce((sum, e) => sum + e.devoluciones, 0);
    return { ventas, rechazos, devoluciones };
  }, [filteredExecs]);

  // Canal totals for quick KPI pills
  const canalTotals = React.useMemo(() => {
    const tat   = execsData.filter(e => e.canal === 'TAT');
    const super_ = execsData.filter(e => e.canal === 'SUPER');
    const sumRech = (arr) => arr.reduce((s, e) => s + e.rechazos, 0);
    const sumVtas = (arr) => arr.reduce((s, e) => s + e.ventas, 0);
    return {
      TAT:   { rechazos: sumRech(tat),   ventas: sumVtas(tat) },
      SUPER: { rechazos: sumRech(super_), ventas: sumVtas(super_) },
    };
  }, [execsData]);

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



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Análisis de Devoluciones</h1>
        <p className="text-slate-800 text-xs md:text-sm mt-1 font-medium">
          Identifique causas de devoluciones, impacto financiero en margen y mapee vendedores o clientes críticos.
        </p>
      </div>

      {/* Returns KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Rechazos Valor */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-orange-50/70 border-orange-200 shadow-xs">
          <div>
            <p className="text-slate-800 text-xs font-bold uppercase tracking-wider">Rechazos</p>
            <h3 className="text-2xl font-black text-orange-700 mt-1">{formatCurrency(totalGeneralReturns)}</h3>
            <p className="text-[10px] text-slate-800 font-medium mt-1">Total motivos excepto M.E.</p>
          </div>
          <div className="p-3 bg-orange-100 text-orange-700 rounded-xl shadow-xs">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Tasa de Rechazos */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-amber-50/70 border-amber-200 shadow-xs">
          <div>
            <p className="text-slate-800 text-xs font-bold uppercase tracking-wider">Tasa de Rechazo</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">
              {formatPercent(totalSalesForRate > 0 ? totalGeneralReturns / totalSalesForRate : 0)}
            </h3>
            <p className="text-[10px] text-slate-800 font-medium mt-1">Porcentaje sobre ventas brutas</p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shadow-xs">
            <Percent className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Cambios Valor */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-rose-50/70 border-rose-200 shadow-xs">
          <div>
            <p className="text-slate-800 text-xs font-bold uppercase tracking-wider">Cambios</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalExpiryReturns)}</h3>
            <p className="text-[10px] text-slate-800 font-medium mt-1">Motivos tipo "M.E." (vencimientos)</p>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shadow-xs">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Tasa de Cambios */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-pink-50/70 border-pink-200 shadow-xs">
          <div>
            <p className="text-slate-800 text-xs font-bold uppercase tracking-wider">Tasa de Cambios</p>
            <h3 className="text-2xl font-black text-pink-700 mt-1">
              {formatPercent(totalSalesForRate > 0 ? totalExpiryReturns / totalSalesForRate : 0)}
            </h3>
            <p className="text-[10px] text-slate-800 font-medium mt-1">Porcentaje sobre ventas brutas</p>
          </div>
          <div className="p-3 bg-pink-100 text-pink-700 rounded-xl shadow-xs">
            <Percent className="h-6 w-6" />
          </div>
        </GlassCard>

        {/* Total Devoluciones */}
        <GlassCard hoverable={false} className="flex justify-between items-center bg-red-50/70 border-red-200 shadow-xs">
          <div>
            <p className="text-slate-600 text-xs font-bold uppercase tracking-wider">Total Devolución</p>
            <h3 className="text-2xl font-black text-red-700 mt-1">{formatCurrency(totalAllReturns)}</h3>
            <p className="text-[10px] text-slate-800 font-medium mt-1">Tasa total: {formatPercent(totalSalesForRate > 0 ? totalAllReturns / totalSalesForRate : 0)}</p>
          </div>
          <div className="p-3 bg-red-100 text-red-700 rounded-xl shadow-xs">
            <TrendingDown className="h-6 w-6" />
          </div>
        </GlassCard>
      </div>

      {/* Tabla de Devoluciones por Ejecutivo Comercial */}
      <GlassCard hoverable={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Rechazos por Ejecutivo Comercial</h3>
            <p className="text-xs text-slate-800 mt-0.5 font-medium">
              Solo rechazos (excluye cambios M.E. por vencimiento). Separado por canal TAT y Supermercados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Canal filter pills */}
            {['TODOS','TAT','SUPER'].map(c => (
              <button
                key={c}
                onClick={() => setCanalFilter(c)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  canalFilter === c
                    ? c === 'TAT'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : c === 'SUPER'
                        ? 'bg-violet-100 text-violet-800 border-violet-300'
                        : 'bg-slate-100 text-slate-900 border-slate-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {c === 'SUPER' ? 'Super' : c === 'TAT' ? 'TAT' : 'Todos'}
                {c !== 'TODOS' && (
                  <span className="ml-1 opacity-80">
                    ({formatPercent(canalTotals[c].ventas > 0 ? canalTotals[c].rechazos / canalTotals[c].ventas : 0)})
                  </span>
                )}
              </button>
            ))}
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                type="text"
                placeholder="Buscar ejecutivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-full sm:w-52 shadow-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 max-h-[500px] overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200 text-slate-700 font-bold select-none">
                <th className="pb-3 pt-2 pl-2 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('ejecutivo')}>
                  EJECUTIVO {sortField === 'ejecutivo' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('nombre')}>
                  NOMBRE {sortField === 'nombre' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-center">CANAL</th>
                <th className="pb-3 pt-2 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('ventas')}>
                  VENTA BRUTA $ {sortField === 'ventas' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('rechazos')}>
                  RECHAZOS $ {sortField === 'rechazos' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="pb-3 pt-2 text-right pr-2 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('porcentaje')}>
                  % RECHAZO {sortField === 'porcentaje' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedExecs.map((item, idx) => {
                const rate = item.ventas > 0 ? item.rechazos / item.ventas : 0;
                const isHigh   = rate > 0.05;
                const isMedium = rate > 0.025;
                const isTAT    = item.canal === 'TAT';
                return (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2.5 pl-2 font-bold font-mono text-slate-900">{item.ejecutivo}</td>
                    <td className="py-2.5 font-bold text-slate-900">{item.nombre}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isTAT
                          ? 'text-sky-800 bg-sky-50 border-sky-200'
                          : 'text-violet-800 bg-violet-50 border-violet-200'
                      }`}>
                        {isTAT ? 'TAT' : 'Super'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-700 font-semibold">{formatCurrency(item.ventas)}</td>
                    <td className="py-2.5 text-right font-bold text-rose-700">{formatCurrency(item.rechazos)}</td>
                    <td className="py-2.5 text-right pr-2">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isHigh   ? 'text-rose-800 bg-rose-50 border-rose-200' :
                        isMedium ? 'text-amber-800 bg-amber-50 border-amber-200' :
                                   'text-emerald-800 bg-emerald-50 border-emerald-200'
                      }`}>
                        {formatPercent(rate)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 font-black">
              <tr>
                <td className="py-3 pl-2 text-blue-800 font-black uppercase">Total {canalFilter !== 'TODOS' ? canalFilter : 'general'}</td>
                <td className="py-3 text-slate-600">—</td>
                <td className="py-3"></td>
                <td className="py-3 text-right font-black text-slate-900 text-xs md:text-sm">{formatCurrency(totalsExecs.ventas)}</td>
                <td className="py-3 text-right font-black text-rose-700 text-xs md:text-sm">{formatCurrency(totalsExecs.rechazos)}</td>
                <td className="py-3 text-right pr-2">
                  <span className="inline-block text-xs font-black px-2.5 py-1 rounded-full text-rose-800 bg-rose-100 border border-rose-200">
                    {formatPercent(totalsExecs.ventas > 0 ? totalsExecs.rechazos / totalsExecs.ventas : 0)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* Radar Comparison and Concepts Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-slate-900 mb-4">Radar de Desempeño y Calidad (Top Vendedores)</h3>
          <BIRadarChart returnsSellers={filteredData.returnsSellers} />
          <p className="text-[10px] text-slate-800 font-medium mt-2 leading-relaxed text-center">
            Calidad representa 100% menos la tasa de devolución. A mayor calidad, menores pérdidas logísticas.
          </p>
        </GlassCard>

        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-slate-900 mb-4">Distribución por Causa Principal</h3>
          <BIFunnelChart data={filteredData.returnsConcepts} />
        </GlassCard>
      </div>

      {/* Critical Clients & Concept Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Clients Table */}
        <GlassCard hoverable={false}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">Clientes Críticos por Rechazos</h3>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[420px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                  <th className="pb-3 pt-2">Cliente</th>
                  <th className="pb-3 pt-2 text-center hidden sm:table-cell">Ejecutivo</th>
                  <th className="pb-3 pt-2 text-center hidden md:table-cell">Eje</th>
                  <th className="pb-3 pt-2 text-right">Devuelto</th>
                  <th className="pb-3 pt-2 text-right pr-2 hidden sm:table-cell">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {criticalClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 font-bold text-slate-900 truncate max-w-[160px]" title={client.cliente}>
                      {client.cliente}
                    </td>
                    <td className="py-3 text-center text-slate-600 font-mono text-[10px] font-bold hidden sm:table-cell">{client.ejecutivo}</td>
                    <td className="py-3 text-center hidden md:table-cell"><CityBadge zona={client.ejecutivo} /></td>
                    <td className="py-3 text-right font-black text-rose-700">{formatShortCurrency(client.totalReturn)}</td>
                    <td className="py-3 text-right text-slate-700 pr-4 hidden sm:table-cell font-semibold">{client.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Concept Breakdown list */}
        <GlassCard hoverable={false}>
          <h3 className="text-base font-bold text-slate-900 mb-4">Métricas por Concepto (Rechazos)</h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
            {sortedConcepts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.concepto}</h4>
                  <p className="text-[10px] text-slate-800 font-medium mt-0.5">Tasa representativa</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900">{formatPercent(item.porcentaje)}</span>
                  <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
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
          <div className="mt-8 pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">Cambios por M.E.</h2>
            <p className="text-slate-600 text-sm">
              Análisis específico de devoluciones que corresponden a Cambios por M.E.
            </p>
          </div>

          {/* Expiry Clients & Concepts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Expiry Clients Table */}
            <GlassCard hoverable={false}>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Clientes Críticos por Cambios</h3>
              </div>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full min-w-[420px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3 text-center hidden sm:table-cell">Ejecutivo</th>
                      <th className="pb-3 text-center hidden md:table-cell">Eje</th>
                      <th className="pb-3 text-right">Devuelto</th>
                      <th className="pb-3 text-right pr-2 hidden sm:table-cell">Registros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {criticalExpiryClients.length > 0 ? criticalExpiryClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-slate-900 truncate max-w-[160px]" title={client.cliente}>
                          {client.cliente}
                        </td>
                        <td className="py-3 text-center text-slate-700 font-mono text-[10px] hidden sm:table-cell">{client.ejecutivo}</td>
                        <td className="py-3 text-center hidden md:table-cell"><CityBadge zona={client.ejecutivo} /></td>
                        <td className="py-3 text-right font-bold text-rose-600">{formatShortCurrency(client.totalReturn)}</td>
                        <td className="py-3 text-right text-slate-700 pr-4 hidden sm:table-cell">{client.count}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-600 text-sm">
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
              <h3 className="text-base font-bold text-slate-900 mb-4">Métricas por Concepto (Cambios)</h3>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                {sortedExpiryConcepts.length > 0 ? sortedExpiryConcepts.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.concepto}</h4>
                      <p className="text-[10px] text-slate-600 mt-0.5">Tasa representativa</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{formatPercent(item.porcentaje)}</span>
                      <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="bg-rose-600 h-full rounded-full" 
                          style={{ width: `${item.porcentaje * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-slate-600 text-sm py-6">
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
