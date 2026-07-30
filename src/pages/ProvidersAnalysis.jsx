import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, ZONA_CIUDAD_MAP } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import { Truck, ChevronDown, ChevronUp } from 'lucide-react';
import alpinaLogo from '../assets/alpina-logo.svg';

// Marcas que se consideran "Otros" — el resto son Derivados
const OTROS_MARCAS = [
  'LECHE ALPINA BOLSA',
  'LECHE ALPINA CAJA',
  'QUESITO ALPINA',
  'DON MAIZ',
  'ANCHETAS',
];

const CITY_META = {
  PEREIRA:   { label: 'Eje Pereira',  bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  MANIZALES: { label: 'Eje Caldas',   bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  ARMENIA:   { label: 'Eje Quindío',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  OTRO:      { label: 'Otro',         bg: 'bg-slate-500/10',   text: 'text-slate-600',   border: 'border-slate-300' },
};

// Colores semáforo según % de proyección
const semaforo = (pct) => {
  if (pct >= 1.0)  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pct >= 0.85) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
};

const PctBadge = ({ value }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold border ${semaforo(value)}`}>
    {Math.round(value * 100)}%
  </span>
);

const ProvidersAnalysis = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const filteredData = getFilteredData(dbData, filters);

  const [sortCol, setSortCol] = useState('vendedor');
  const [sortDir, setSortDir] = useState('asc');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Todos los datos de zonas (cada zona tiene presupuesto, ventasNetas, proyectado, vendedor)
  const zones = filteredData.zones || [];

  // Datos de productos para separar Derivados vs Otros
  const productDistrib = dbData.productDistrib || [];

  // Pre-calcular: para cada zona cuántas ventas son Derivados y cuántas son Otros
  // Si no hay productDistrib, usamos la distribución estimada 88% Derivados / 12% Otros
  // (ratio real del cubo de la imagen)
  const DERIV_RATIO = 0.88;
  const OTROS_RATIO = 0.12;

  const hasProductData = productDistrib.length > 0;

  // Calcular split Derivados/Otros por zona desde productDistrib
  const zonaSplitMap = useMemo(() => {
    const map = {};
    if (!hasProductData) return map;

    productDistrib.forEach(p => {
      const zona = p.zona;
      if (!zona) return;
      if (!map[zona]) map[zona] = { derivados: { ventas: 0, facturas: 0 }, otros: { ventas: 0, facturas: 0 } };
      const isOtro = OTROS_MARCAS.some(m => (p.nmTpMarca || '').toUpperCase().includes(m.toUpperCase()));
      const cat = isOtro ? 'otros' : 'derivados';
      map[zona][cat].ventas += p.ventas || 0;
      map[zona][cat].facturas += p.facturas || 0;
    });
    return map;
  }, [productDistrib, hasProductData]);

  // Agrupar por vendedor
  const rows = useMemo(() => {
    const map = {};

    zones.forEach(z => {
      const vendor = z.vendedor || 'Sin Asignar';
      const city = ZONA_CIUDAD_MAP[z.zona] || 'OTRO';
      if (cityFilter !== 'ALL' && city !== cityFilter) return;

      if (!map[vendor]) {
        map[vendor] = {
          vendedor: vendor,
          city,
          // Presupuesto total → split estimado
          pptoTotal: 0,
          ventasTotal: 0,
          proyTotal: 0,
          // Derivados
          pptoDerivados: 0,
          ventaDerivados: 0,
          // Otros
          pptoOtros: 0,
          ventaOtros: 0,
        };
      }

      const ppto = z.presupuesto || 0;
      const ventas = z.ventasNetas || 0;
      const proy = z.proyectado || 0;

      map[vendor].pptoTotal += ppto;
      map[vendor].ventasTotal += ventas;
      map[vendor].proyTotal += proy;

      // Split basado en productDistrib si existe, o en ratio estático
      if (hasProductData && zonaSplitMap[z.zona]) {
        const split = zonaSplitMap[z.zona];
        const totalProd = (split.derivados.ventas + split.otros.ventas) || 1;
        const derivRatio = split.derivados.ventas / totalProd;
        const otrosRatio = split.otros.ventas / totalProd;
        map[vendor].pptoDerivados += ppto * derivRatio;
        map[vendor].ventaDerivados += ventas * derivRatio;
        map[vendor].pptoOtros += ppto * otrosRatio;
        map[vendor].ventaOtros += ventas * otrosRatio;
      } else {
        map[vendor].pptoDerivados += ppto * DERIV_RATIO;
        map[vendor].ventaDerivados += ventas * DERIV_RATIO;
        map[vendor].pptoOtros += ppto * OTROS_RATIO;
        map[vendor].ventaOtros += ventas * OTROS_RATIO;
      }
    });

    // Calcular proyecciones y % por fila
    return Object.values(map).map(r => {
      const dias = (dbData.salesDaily || []).filter(d => d.fecha && d.fecha !== 'general').length || 1;
      const factor = 22 / Math.min(dias, 22);

      const proyDerivados = r.ventaDerivados * factor;
      const proyOtros = r.ventaOtros * factor;

      return {
        ...r,
        pptoDerivados: Math.round(r.pptoDerivados),
        ventaDerivados: Math.round(r.ventaDerivados),
        proyDerivados: Math.round(proyDerivados),
        pctDerivados: r.pptoDerivados > 0 ? proyDerivados / r.pptoDerivados : 0,
        pptoOtros: Math.round(r.pptoOtros),
        ventaOtros: Math.round(r.ventaOtros),
        proyOtros: Math.round(proyOtros),
        pctOtros: r.pptoOtros > 0 ? proyOtros / r.pptoOtros : 0,
      };
    });
  }, [zones, cityFilter, zonaSplitMap, hasProductData, dbData.salesDaily]);

  // Ordenar
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortCol === 'vendedor') return mul * a.vendedor.localeCompare(b.vendedor);
      if (sortCol === 'pptoD') return mul * (a.pptoDerivados - b.pptoDerivados);
      if (sortCol === 'ventaD') return mul * (a.ventaDerivados - b.ventaDerivados);
      if (sortCol === 'pctD') return mul * (a.pctDerivados - b.pctDerivados);
      if (sortCol === 'pptoO') return mul * (a.pptoOtros - b.pptoOtros);
      if (sortCol === 'ventaO') return mul * (a.ventaOtros - b.ventaOtros);
      if (sortCol === 'pctO') return mul * (a.pctOtros - b.pctOtros);
      return 0;
    });
  }, [rows, sortCol, sortDir]);

  // Totales
  const totals = useMemo(() => sorted.reduce((acc, r) => ({
    pptoDerivados: acc.pptoDerivados + r.pptoDerivados,
    ventaDerivados: acc.ventaDerivados + r.ventaDerivados,
    proyDerivados: acc.proyDerivados + r.proyDerivados,
    pptoOtros: acc.pptoOtros + r.pptoOtros,
    ventaOtros: acc.ventaOtros + r.ventaOtros,
    proyOtros: acc.proyOtros + r.proyOtros,
  }), { pptoDerivados:0, ventaDerivados:0, proyDerivados:0, pptoOtros:0, ventaOtros:0, proyOtros:0 }), [sorted]);

  const totalPctD = totals.pptoDerivados > 0 ? totals.proyDerivados / totals.pptoDerivados : 0;
  const totalPctO = totals.pptoOtros > 0 ? totals.proyOtros / totals.pptoOtros : 0;

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp className="inline h-3 w-3 ml-0.5 text-sky-400" /> : <ChevronDown className="inline h-3 w-3 ml-0.5 text-sky-400" />)
    : <ChevronDown className="inline h-3 w-3 ml-0.5 text-slate-700" />;

  const TH = ({ col, children, right }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`pb-3 px-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
    >
      {children}<SortIcon col={col} />
    </th>
  );

  // KPIs resumen
  const totalDerivados = totals.ventaDerivados;
  const totalOtros = totals.ventaOtros;
  const totalVentas = totalDerivados + totalOtros;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-3 rounded-full bg-white border border-slate-200 px-4 py-2 shadow-lg w-fit">
            <img src={alpinaLogo} alt="Alpina" className="h-9 w-auto" loading="lazy" />
            <span className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em]">Análisis Proveedores</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Derivados vs Otros</h1>
            <p className="text-slate-700 text-xs md:text-sm mt-1">
              Presupuesto, venta real y proyección al cierre del mes por vendedor — Derivados y Otros separados.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <GlassCard hoverable={false} className="bg-white border border-sky-500/20 p-3 md:p-4">
          <p className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-wider">Total Derivados</p>
          <p className="text-lg md:text-2xl font-bold text-sky-400 mt-1">{formatShortCurrency(totalDerivados)}</p>
          <p className="text-[9px] md:text-[10px] text-slate-600 mt-1">{totalVentas > 0 ? Math.round(totalDerivados / totalVentas * 100) : 0}% del total</p>
        </GlassCard>
        <GlassCard hoverable={false} className="bg-white border border-violet-500/20 p-3 md:p-4">
          <p className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-wider">Total Otros</p>
          <p className="text-lg md:text-2xl font-bold text-violet-400 mt-1">{formatShortCurrency(totalOtros)}</p>
          <p className="text-[9px] md:text-[10px] text-slate-600 mt-1">{totalVentas > 0 ? Math.round(totalOtros / totalVentas * 100) : 0}% del total</p>
        </GlassCard>
        <GlassCard hoverable={false} className="bg-white border border-emerald-500/20 p-3 md:p-4">
          <p className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-wider">Proy % Derivados</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 ${totalPctD >= 1 ? 'text-emerald-400' : totalPctD >= 0.85 ? 'text-amber-400' : 'text-rose-400'}`}>
            {Math.round(totalPctD * 100)}%
          </p>
          <p className="text-[9px] md:text-[10px] text-slate-600 mt-1">vs presupuesto</p>
        </GlassCard>
        <GlassCard hoverable={false} className="bg-white border border-amber-500/20 p-3 md:p-4">
          <p className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-wider">Proy % Otros</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 ${totalPctO >= 1 ? 'text-emerald-400' : totalPctO >= 0.85 ? 'text-amber-400' : 'text-rose-400'}`}>
            {Math.round(totalPctO * 100)}%
          </p>
          <p className="text-[9px] md:text-[10px] text-slate-600 mt-1">vs presupuesto</p>
        </GlassCard>
      </div>

      {/* Filtro ciudad */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-600">Filtrar por sede:</span>
        {['ALL', 'PEREIRA', 'MANIZALES', 'ARMENIA'].map(c => (
          <button
            key={c}
            onClick={() => setCityFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              cityFilter === c
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-600'
            }`}
          >
            {c === 'ALL' ? 'Todas' : c === 'PEREIRA' ? 'Eje Pereira' : c === 'MANIZALES' ? 'Eje Caldas' : 'Eje Quindío'}
          </button>
        ))}
        {!hasProductData && (
          <span className="text-[10px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-1 rounded-lg">
            ⚠ Split estimado (88% Deriv / 12% Otros) — sube datos para precisión exacta
          </span>
        )}
      </div>

      {/* Tabla principal */}
      <GlassCard hoverable={false} className="bg-white/95 border border-slate-200 p-4 md:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-400" />
              Presupuesto · Venta Real · Proyección al Cierre
            </h3>
            <p className="text-[10px] md:text-xs text-slate-600 mt-1">
              {sorted.length} vendedores · Haz clic en columna para ordenar
            </p>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>≥100%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>85-99%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>&lt;85%</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
          <table className="w-full min-w-[900px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300">
                {/* Header grupos */}
                <th className="pb-1 px-2 text-left" rowSpan={2}></th>
                <th className="pb-1 px-2 text-center text-[9px] font-bold uppercase tracking-widest text-sky-400 border-b border-sky-500/30" colSpan={4}>
                  DERIVADOS
                </th>
                <th className="pb-1 px-2 text-center text-[9px] font-bold uppercase tracking-widest text-violet-400 border-b border-violet-500/30" colSpan={4}>
                  OTROS (Leche, Quesito, Don Maíz, Anchetas)
                </th>
              </tr>
              <tr className="border-b border-slate-200">
                <TH col="pptoD" right>Ppto Deriv</TH>
                <TH col="ventaD" right>Venta Deriv</TH>
                <TH col="pptoD" right>Proy $</TH>
                <TH col="pctD" right>Proy %</TH>
                <TH col="pptoO" right>Ppto Otros</TH>
                <TH col="ventaO" right>Venta Otros</TH>
                <TH col="pptoO" right>Proy $</TH>
                <TH col="pctO" right>Proy %</TH>
              </tr>
              {/* Fila de totales arriba */}
              <tr className="bg-slate-100/80 border-b-2 border-slate-300 text-[10px] font-bold">
                <td className="py-2 px-2 text-slate-900">Total general</td>
                <td className="py-2 px-2 text-right text-slate-200">{formatShortCurrency(totals.pptoDerivados)}</td>
                <td className="py-2 px-2 text-right text-sky-300">{formatShortCurrency(totals.ventaDerivados)}</td>
                <td className="py-2 px-2 text-right text-slate-200">{formatShortCurrency(totals.proyDerivados)}</td>
                <td className="py-2 px-2 text-right"><PctBadge value={totalPctD} /></td>
                <td className="py-2 px-2 text-right text-slate-200">{formatShortCurrency(totals.pptoOtros)}</td>
                <td className="py-2 px-2 text-right text-violet-300">{formatShortCurrency(totals.ventaOtros)}</td>
                <td className="py-2 px-2 text-right text-slate-200">{formatShortCurrency(totals.proyOtros)}</td>
                <td className="py-2 px-2 text-right"><PctBadge value={totalPctO} /></td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-200/30 transition-colors">
                  {/* Vendedor */}
                  <td className="py-2.5 px-2 text-slate-200 font-semibold text-[11px] md:text-xs whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        ZONA_CIUDAD_MAP && (() => {
                          const city = row.city;
                          return city === 'PEREIRA' ? 'bg-blue-400' : city === 'MANIZALES' ? 'bg-indigo-400' : city === 'ARMENIA' ? 'bg-emerald-400' : 'bg-slate-400';
                        })()
                      }`} />
                      {row.vendedor}
                    </div>
                  </td>

                  {/* Derivados */}
                  <td className="py-2.5 px-2 text-right text-slate-600 tabular-nums">{formatShortCurrency(row.pptoDerivados)}</td>
                  <td className="py-2.5 px-2 text-right text-sky-300 font-semibold tabular-nums">{formatShortCurrency(row.ventaDerivados)}</td>
                  <td className="py-2.5 px-2 text-right text-slate-200 tabular-nums">{formatShortCurrency(row.proyDerivados)}</td>
                  <td className="py-2.5 px-2 text-right"><PctBadge value={row.pctDerivados} /></td>

                  {/* Otros */}
                  <td className="py-2.5 px-2 text-right text-slate-600 tabular-nums">{formatShortCurrency(row.pptoOtros)}</td>
                  <td className="py-2.5 px-2 text-right text-violet-300 font-semibold tabular-nums">{formatShortCurrency(row.ventaOtros)}</td>
                  <td className="py-2.5 px-2 text-right text-slate-200 tabular-nums">{formatShortCurrency(row.proyOtros)}</td>
                  <td className="py-2.5 px-2 text-right"><PctBadge value={row.pctOtros} /></td>
                </tr>
              ))}
            </tbody>
            {/* Fila total al final también */}
            <tfoot>
              <tr className="bg-slate-100/80 border-t-2 border-slate-300 text-[10px] font-bold">
                <td className="py-2.5 px-2 text-slate-900">Total general</td>
                <td className="py-2.5 px-2 text-right text-slate-200">{formatShortCurrency(totals.pptoDerivados)}</td>
                <td className="py-2.5 px-2 text-right text-sky-300">{formatShortCurrency(totals.ventaDerivados)}</td>
                <td className="py-2.5 px-2 text-right text-slate-200">{formatShortCurrency(totals.proyDerivados)}</td>
                <td className="py-2.5 px-2 text-right"><PctBadge value={totalPctD} /></td>
                <td className="py-2.5 px-2 text-right text-slate-200">{formatShortCurrency(totals.pptoOtros)}</td>
                <td className="py-2.5 px-2 text-right text-violet-300">{formatShortCurrency(totals.ventaOtros)}</td>
                <td className="py-2.5 px-2 text-right text-slate-200">{formatShortCurrency(totals.proyOtros)}</td>
                <td className="py-2.5 px-2 text-right"><PctBadge value={totalPctO} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </GlassCard>

      {/* Nota definitoria */}
      <GlassCard hoverable={false} className="bg-white border border-slate-200 p-4">
        <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">
          <span className="text-slate-200 font-semibold">Definición de categorías:</span>{' '}
          <span className="text-violet-300 font-semibold">Otros</span> incluye:{' '}
          {OTROS_MARCAS.join(', ')}.{' '}
          <span className="text-sky-300 font-semibold">Derivados</span> incluye todos los demás productos del portafolio Alpina.{' '}
          La proyección al cierre se calcula linealmente con base en los días hábiles transcurridos del mes.
          {!hasProductData && (
            <span className="text-amber-400 ml-2">
              ⚠ Se está usando una distribución estimada (88% Derivados / 12% Otros) por no haber datos de productos cargados.
            </span>
          )}
        </p>
      </GlassCard>
    </div>
  );
};

export default ProvidersAnalysis;
