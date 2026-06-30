import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import { LayoutGrid, Tag, Layers, TrendingUp, Search, ChevronDown, ChevronRight, ShoppingBag, X } from 'lucide-react';
import { ZONAS_POR_CIUDAD, ZONA_CIUDAD_MAP } from '../utils/calculations';

const BRAND_COLORS = [
  '#38bdf8','#818cf8','#34d399','#f59e0b','#f472b6',
  '#a78bfa','#fb923c','#2dd4bf','#e879f9','#4ade80',
  '#facc15','#60a5fa','#f87171','#c084fc','#86efac'
];

const DistribucionNumerica = () => {
  const dbData = useStore(state => state.dbData);
  const selectedCity = useStore(state => state.selectedCity);
  const selectedZone = useStore(state => state.selectedZone);
  const selectedSeller = useStore(state => state.selectedSeller);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('ventas');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedBrands, setExpandedBrands] = useState({});
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedFamily, setSelectedFamily] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const rawProducts = useMemo(() => dbData?.productDistrib || [], [dbData]);

  const filteredRawProducts = useMemo(() => {
    let list = rawProducts;
    
    // Filter by global city/sede
    if (selectedCity && selectedCity !== 'Todas') {
      const zonasPermitidas = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
      list = list.filter(p => p.zona && zonasPermitidas.has(p.zona));
    }
    
    // Filter by global zone
    if (selectedZone && selectedZone !== 'Todas') {
      list = list.filter(p => p.zona === selectedZone);
    }
    
    // Filter by global seller
    if (selectedSeller && selectedSeller !== 'Todas') {
      list = list.filter(p => p.vendedor === selectedSeller);
    }
    
    return list;
  }, [rawProducts, selectedCity, selectedZone, selectedSeller]);

  const products = useMemo(() => {
    // If the data does not contain zone information (e.g. old data or mock data), 
    // fall back to showing rawProducts directly to avoid returning empty list
    const hasZoneInfo = rawProducts.some(p => p.zona);
    if (!hasZoneInfo) return rawProducts;

    const map = {};
    filteredRawProducts.forEach(p => {
      const key = `${p.nmTpMarca}||${p.nmTpFamilia}||${p.nbProducto}`;
      if (!map[key]) {
        map[key] = {
          nbProducto: p.nbProducto,
          nmProducto: p.nmProducto,
          tpProducto: p.tpProducto,
          nmTpMarca: p.nmTpMarca,
          nmTpFamilia: p.nmTpFamilia,
          ventas: 0,
          facturas: 0,
          unidades: 0
        };
      }
      map[key].ventas += p.ventas || 0;
      map[key].facturas += p.facturas || 0;
      map[key].unidades += p.unidades || 0;
    });

    const totalVentas = Object.values(map).reduce((s, p) => s + p.ventas, 0);

    return Object.values(map).map(p => ({
      ...p,
      participacion: totalVentas > 0 ? p.ventas / totalVentas : 0
    }));
  }, [rawProducts, filteredRawProducts]);

  // Filter raw transactions of the selected product (under the active global filter scope)
  const productDetails = useMemo(() => {
    if (!selectedProduct) return null;
    return filteredRawProducts.filter(p => p.nbProducto === selectedProduct.nbProducto);
  }, [filteredRawProducts, selectedProduct]);

  // Aggregate metrics and chart data for the selected product modal
  const productStats = useMemo(() => {
    if (!productDetails || productDetails.length === 0) return null;

    const totalSales = productDetails.reduce((sum, p) => sum + p.ventas, 0);
    const totalUnits = productDetails.reduce((sum, p) => sum + p.unidades, 0);
    const totalInvoices = productDetails.reduce((sum, p) => sum + p.facturas, 0);
    const avgPrice = totalUnits > 0 ? totalSales / totalUnits : 0;

    // 1. Sede Distribution (Manizales/Armenia/Pereira)
    const sedeMap = { ARMENIA: 0, MANIZALES: 0, PEREIRA: 0 };
    productDetails.forEach(p => {
      const city = ZONA_CIUDAD_MAP[p.zona] || 'OTRO';
      if (sedeMap[city] !== undefined) {
        sedeMap[city] += p.ventas;
      }
    });

    const activeSedes = Object.entries(sedeMap)
      .map(([name, sales]) => ({ name, sales }))
      .filter(s => s.sales > 0);

    // Donut chart configurations
    const donutOptions = {
      chart: { type: 'donut', background: 'transparent', fontFamily: 'Inter, sans-serif' },
      colors: BRAND_COLORS,
      labels: activeSedes.map(s => s.name === 'MANIZALES' ? 'Eje Caldas' : s.name === 'ARMENIA' ? 'Eje Quindío' : 'Eje Pereira'),
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom', fontSize: '10px', labels: { colors: '#94a3b8' } },
      tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
      plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Ventas', color: '#94a3b8', formatter: () => formatShortCurrency(totalSales) } } } } }
    };
    const donutSeries = activeSedes.map(s => Math.round(s.sales));

    // 2. Top Zones (up to 5)
    const zoneMap = {};
    productDetails.forEach(p => {
      zoneMap[p.zona] = (zoneMap[p.zona] || 0) + p.ventas;
    });
    const zoneList = Object.entries(zoneMap)
      .map(([zona, sales]) => ({ zona, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const barOptions = {
      chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
      colors: ['#38bdf8'],
      dataLabels: { enabled: true, formatter: (val) => formatShortCurrency(val), style: { fontSize: '9px', colors: ['#94a3b8'] }, offsetX: 8 },
      xaxis: { categories: zoneList.map(z => z.zona), labels: { show: false } },
      yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
      tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
      grid: { show: false }
    };
    const barSeries = [{ name: 'Ventas', data: zoneList.map(z => Math.round(z.sales)) }];

    // 3. Top Sellers
    const sellerMap = {};
    productDetails.forEach(p => {
      sellerMap[p.vendedor] = (sellerMap[p.vendedor] || 0) + p.ventas;
    });
    const sellerList = Object.entries(sellerMap)
      .map(([seller, sales]) => ({ seller, sales }))
      .sort((a, b) => b.sales - a.sales);

    return {
      totalSales,
      totalUnits,
      totalInvoices,
      avgPrice,
      activeSedes,
      donutOptions,
      donutSeries,
      zoneList,
      barOptions,
      barSeries,
      sellerList
    };
  }, [productDetails]);

  // Format short values for nested graphs
  function formatShortCurrency(val) {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  }

  const brands = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.nmTpMarca))).sort()], [products]);
  const families = useMemo(() => {
    const base = products.filter(p => selectedBrand === 'Todas' || p.nmTpMarca === selectedBrand);
    return ['Todas', ...Array.from(new Set(base.map(p => p.nmTpFamilia))).sort()];
  }, [products, selectedBrand]);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedBrand !== 'Todas') list = list.filter(p => p.nmTpMarca === selectedBrand);
    if (selectedFamily !== 'Todas') list = list.filter(p => p.nmTpFamilia === selectedFamily);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nmProducto.toLowerCase().includes(q) ||
        p.nbProducto.toLowerCase().includes(q) ||
        p.nmTpMarca.toLowerCase().includes(q) ||
        p.nmTpFamilia.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'ventas') return mul * (a.ventas - b.ventas);
      if (sortBy === 'facturas') return mul * (a.facturas - b.facturas);
      if (sortBy === 'nmProducto') return mul * a.nmProducto.localeCompare(b.nmProducto);
      return 0;
    });
  }, [products, selectedBrand, selectedFamily, search, sortBy, sortDir]);

  const totalVentas = useMemo(() => products.reduce((s, p) => s + p.ventas, 0), [products]);
  const totalFacturas = useMemo(() => products.reduce((s, p) => s + p.facturas, 0), [products]);
  const activeBrands = useMemo(() => new Set(products.map(p => p.nmTpMarca)).size, [products]);
  const activeFamilies = useMemo(() => new Set(products.map(p => p.nmTpFamilia)).size, [products]);
  const activeProducts = products.length;

  const brandSummary = useMemo(() => {
    const map = {};
    products.forEach(p => {
      if (!map[p.nmTpMarca]) map[p.nmTpMarca] = { ventas: 0, facturas: 0, productos: 0 };
      map[p.nmTpMarca].ventas += p.ventas;
      map[p.nmTpMarca].facturas += p.facturas;
      map[p.nmTpMarca].productos += 1;
    });
    return Object.entries(map)
      .map(([marca, d]) => ({ marca, ...d, participacion: totalVentas > 0 ? d.ventas / totalVentas : 0 }))
      .sort((a, b) => b.ventas - a.ventas);
  }, [products, totalVentas]);

  const familySummary = useMemo(() => {
    const map = {};
    const base = selectedBrand === 'Todas' ? products : products.filter(p => p.nmTpMarca === selectedBrand);
    base.forEach(p => {
      if (!map[p.nmTpFamilia]) map[p.nmTpFamilia] = 0;
      map[p.nmTpFamilia] += p.ventas;
    });
    return Object.entries(map)
      .map(([familia, ventas]) => ({ familia, ventas }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 12);
  }, [products, selectedBrand]);

  const brandTree = useMemo(() => {
    const tree = {};
    products.forEach(p => {
      if (!tree[p.nmTpMarca]) tree[p.nmTpMarca] = {};
      if (!tree[p.nmTpMarca][p.nmTpFamilia]) tree[p.nmTpMarca][p.nmTpFamilia] = [];
      tree[p.nmTpMarca][p.nmTpFamilia].push(p);
    });
    return tree;
  }, [products]);

  const toggleBrand = (marca) => setExpandedBrands(prev => ({ ...prev, [marca]: !prev[marca] }));

  const barOptions = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, dataLabels: { position: 'top' } } },
    colors: BRAND_COLORS,
    dataLabels: { enabled: true, formatter: (val) => `${((val / totalVentas) * 100).toFixed(1)}%`, style: { fontSize: '10px', colors: ['#94a3b8'] }, offsetX: 8 },
    xaxis: { categories: brandSummary.slice(0, 10).map(b => b.marca.length > 20 ? b.marca.substring(0, 20) + '…' : b.marca), labels: { formatter: v => `$${(v / 1e6).toFixed(0)}M`, style: { fontSize: '10px', colors: '#64748b' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
    tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
    grid: { borderColor: '#1e293b', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    legend: { show: false }
  };
  const barSeries = [{ name: 'Ventas', data: brandSummary.slice(0, 10).map(b => Math.round(b.ventas)) }];

  const donutOptions = {
    chart: { type: 'donut', background: 'transparent', fontFamily: 'Inter, sans-serif' },
    colors: BRAND_COLORS,
    labels: familySummary.map(f => f.familia.length > 18 ? f.familia.substring(0, 18) + '…' : f.familia),
    dataLabels: { enabled: false },
    legend: { show: true, position: 'bottom', fontSize: '10px', labels: { colors: '#94a3b8' } },
    tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', color: '#94a3b8', formatter: () => `$${(familySummary.reduce((s, f) => s + f.ventas, 0) / 1e6).toFixed(0)}M` } } } } }
  };
  const donutSeries = familySummary.map(f => Math.round(f.ventas));

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };
  const SortIcon = ({ col }) => sortBy === col
    ? <span className="ml-1 text-blue-400 text-[10px]">{sortDir === 'desc' ? '▼' : '▲'}</span>
    : <span className="ml-1 text-slate-700 text-[10px]">▼</span>;

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Distribución Numérica</h1>
          <p className="text-slate-400 text-sm mt-1">Análisis de ventas por marca, familia y producto.</p>
        </div>
        <GlassCard hoverable={false} className="p-12 text-center bg-slate-950/70 border border-slate-800">
          <LayoutGrid className="h-14 w-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold text-lg">Sin datos de productos</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Sube un nuevo archivo Excel que incluya las columnas <span className="text-blue-400 font-mono">nbProducto</span>, <span className="text-blue-400 font-mono">nmProducto</span>, <span className="text-blue-400 font-mono">tpProducto</span>, <span className="text-blue-400 font-mono">nmTpMarca</span> y <span className="text-blue-400 font-mono">nmTpFamilia</span> para ver la distribución numérica.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Distribución Numérica</h1>
        <p className="text-slate-400 text-sm mt-1">Análisis completo de ventas por marca, familia y producto — cobertura y participación.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Ventas Totales', value: formatCurrency(totalVentas), icon: TrendingUp, color: 'text-blue-400', border: 'border-blue-500/20' },
          { label: 'Marcas Activas', value: activeBrands, icon: Tag, color: 'text-purple-400', border: 'border-purple-500/20' },
          { label: 'Familias Activas', value: activeFamilies, icon: Layers, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Productos Activos', value: formatNumber(activeProducts), icon: ShoppingBag, color: 'text-amber-400', border: 'border-amber-500/20' },
          { label: 'Facturas', value: formatNumber(totalFacturas), icon: LayoutGrid, color: 'text-sky-400', border: 'border-sky-500/20' },
        ].map(({ label, value, icon: Icon, color, border }) => (
          <GlassCard key={label} hoverable={false} className={`bg-slate-950/85 border ${border} p-4`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
              </div>
              <Icon className={`h-5 w-5 ${color} opacity-60 mt-0.5`} />
            </div>
          </GlassCard>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-slate-400 font-medium">Filtrar marcas y familias:</span>
        <select value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setSelectedFamily('Todas'); }}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-blue-500/50 outline-none cursor-pointer">
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:border-blue-500/50 outline-none cursor-pointer">
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Top Marcas por Ventas</h3>
          <p className="text-xs text-slate-500 mb-4">Las 10 marcas con mayor facturación en el periodo</p>
          {brandSummary.length > 0 ? <Chart options={barOptions} series={barSeries} type="bar" height={280} /> : <p className="text-slate-600 text-sm text-center py-12">Sin datos</p>}
        </GlassCard>
        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5">
          <h3 className="text-sm font-bold text-white mb-1">Participación por Familia{selectedBrand !== 'Todas' && <span className="ml-2 text-xs text-blue-400">— {selectedBrand}</span>}</h3>
          <p className="text-xs text-slate-500 mb-4">Distribución de ventas por familia de producto</p>
          {familySummary.length > 0 ? <Chart options={donutOptions} series={donutSeries} type="donut" height={280} /> : <p className="text-slate-600 text-sm text-center py-12">Sin datos</p>}
        </GlassCard>
      </div>
      <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Árbol Marca → Familia → Productos</h3>
            <p className="text-xs text-slate-500 mt-0.5">Expande cada marca para ver sus familias y productos</p>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">{brandSummary.length} marcas</span>
        </div>
        <div className="space-y-1">
          {brandSummary.map((b, bi) => {
            const isExpanded = !!expandedBrands[b.marca];
            const familiasTree = brandTree[b.marca] || {};
            const color = BRAND_COLORS[bi % BRAND_COLORS.length];
            return (
              <div key={b.marca}>
                <button onClick={() => toggleBrand(b.marca)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/40 transition-colors text-left group">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="flex-1 text-sm font-semibold text-slate-200 truncate">{b.marca}</span>
                  <span className="text-[10px] text-slate-500 hidden sm:block">{b.productos} productos · {b.facturas.toLocaleString('es-CO')} facturas</span>
                  <span className="text-xs font-bold ml-4 shrink-0" style={{ color }}>{formatPercent(b.participacion)}</span>
                  <span className="text-xs text-slate-300 ml-3 shrink-0">{formatCurrency(b.ventas)}</span>
                </button>
                {isExpanded && Object.entries(familiasTree).sort(([,a],[,b]) => b.reduce((s,p)=>s+p.ventas,0) - a.reduce((s,p)=>s+p.ventas,0)).map(([familia, prods]) => {
                  const famVentas = prods.reduce((s, p) => s + p.ventas, 0);
                  return (
                    <div key={familia} className="ml-8 mt-0.5">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400 border-l border-slate-800 ml-1">
                        <Layers className="h-3 w-3 text-slate-600 shrink-0" />
                        <span className="font-semibold text-slate-300">{familia}</span>
                        <span className="text-slate-600">—</span>
                        <span>{prods.length} productos</span>
                        <span className="ml-auto font-semibold text-slate-300">{formatCurrency(famVentas)}</span>
                      </div>
                      <div className="ml-5 border-l border-slate-800/60 space-y-0.5 pb-1">
                        {[...prods].sort((a,b)=>b.ventas-a.ventas).slice(0,15).map(p => (
                          <div key={p.nbProducto} className="flex items-center gap-2 px-3 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 rounded transition-colors">
                            <span className="font-mono text-slate-600 w-14 shrink-0 truncate">{p.nbProducto}</span>
                            <span className="flex-1 truncate">{p.nmProducto}</span>
                            {p.tpProducto && <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{p.tpProducto}</span>}
                            <span className="text-slate-400 font-semibold shrink-0">{formatCurrency(p.ventas)}</span>
                          </div>
                        ))}
                        {prods.length > 15 && <p className="text-[10px] text-slate-700 px-3 py-0.5">+{prods.length - 15} más productos…</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </GlassCard>
      <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Detalle de Productos</h3>
            <p className="text-xs text-slate-500 mt-0.5">{filtered.length.toLocaleString('es-CO')} productos · haz clic en columna para ordenar</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por producto, código o marca…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-10 py-2 outline-none focus:border-blue-500/50 transition-colors"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-[0.10em] text-[9px]">
                <th className="pb-3 pr-3 font-semibold">Código</th>
                <th className="pb-3 pr-3 font-semibold cursor-pointer hover:text-slate-300 transition-colors" onClick={() => toggleSort('nmProducto')}>Producto <SortIcon col="nmProducto" /></th>
                <th className="pb-3 pr-3 font-semibold hidden md:table-cell">Tipo</th>
                <th className="pb-3 pr-3 font-semibold hidden sm:table-cell">Marca</th>
                <th className="pb-3 pr-3 font-semibold hidden lg:table-cell">Familia</th>
                <th className="pb-3 pr-3 font-semibold text-right cursor-pointer hover:text-slate-300 transition-colors" onClick={() => toggleSort('ventas')}>Ventas <SortIcon col="ventas" /></th>
                <th className="pb-3 pr-3 font-semibold text-right cursor-pointer hover:text-slate-300 transition-colors" onClick={() => toggleSort('facturas')}>Facturas <SortIcon col="facturas" /></th>
                <th className="pb-3 font-semibold text-right">Part.%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {filtered.slice(0, 200).map((p, i) => (
                <tr 
                  key={`${p.nbProducto}-${i}`} 
                  onClick={() => setSelectedProduct(p)} 
                  className="hover:bg-slate-900/40 cursor-pointer transition-colors group"
                >
                  <td className="py-2 pr-3 font-mono text-slate-600 text-[10px]">{p.nbProducto}</td>
                  <td className="py-2 pr-3 text-slate-200 font-medium max-w-[200px] truncate group-hover:text-blue-400 transition-colors">{p.nmProducto}</td>
                  <td className="py-2 pr-3 hidden md:table-cell">{p.tpProducto && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{p.tpProducto}</span>}</td>
                  <td className="py-2 pr-3 text-slate-400 hidden sm:table-cell truncate max-w-[120px]">{p.nmTpMarca}</td>
                  <td className="py-2 pr-3 text-slate-500 hidden lg:table-cell truncate max-w-[140px]">{p.nmTpFamilia}</td>
                  <td className="py-2 pr-3 text-right text-slate-200 font-semibold tabular-nums">{formatCurrency(p.ventas)}</td>
                  <td className="py-2 pr-3 text-right text-slate-400 tabular-nums">{p.facturas.toLocaleString('es-CO')}</td>
                  <td className="py-2 text-right"><span className={`font-bold text-[10px] ${p.participacion >= 0.05 ? 'text-blue-400' : p.participacion >= 0.01 ? 'text-slate-300' : 'text-slate-600'}`}>{(p.participacion * 100).toFixed(1)}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="text-[11px] text-slate-600 text-center py-3">Mostrando 200 de {filtered.length.toLocaleString('es-CO')} productos. Usa el buscador para filtrar.</p>}
        </div>
      </GlassCard>

      {/* Product Detail Modal */}
      {selectedProduct && productStats && (
        <div 
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative flex flex-col gap-6 text-slate-300"
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                Ficha de Producto
              </span>
              <h2 className="text-xl font-bold text-white mt-3">{selectedProduct.nmProducto}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                <span>Código: <strong className="font-mono text-slate-300">{selectedProduct.nbProducto}</strong></span>
                <span>·</span>
                <span>Marca: <strong className="text-slate-300">{selectedProduct.nmTpMarca}</strong></span>
                <span>·</span>
                <span>Familia: <strong className="text-slate-300">{selectedProduct.nmTpFamilia}</strong></span>
                {selectedProduct.tpProducto && (
                  <>
                    <span>·</span>
                    <span>Tipo: <strong className="text-slate-300">{selectedProduct.tpProducto}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ventas del Producto', value: formatCurrency(productStats.totalSales), color: 'text-blue-400' },
                { label: 'Unidades Vendidas', value: formatNumber(productStats.totalUnits), color: 'text-amber-400' },
                { label: 'Impacto (Facturas)', value: formatNumber(productStats.totalInvoices), color: 'text-emerald-400' },
                { label: 'Precio Promedio Unitario', value: formatCurrency(productStats.avgPrice), color: 'text-purple-400' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{kpi.label}</span>
                  <span className={`text-lg font-bold ${kpi.color} mt-0.5`}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sede Donut */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 flex flex-col">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Ventas por Sede (Eje)</h4>
                <div className="flex-1 flex items-center justify-center min-h-[220px]">
                  {productStats.activeSedes.length > 0 ? (
                    <Chart options={productStats.donutOptions} series={productStats.donutSeries} type="donut" width="100%" height={220} />
                  ) : (
                    <p className="text-slate-600 text-xs">Sin ventas en el periodo filtrado</p>
                  )}
                </div>
              </div>

              {/* Zones Bar */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5 flex flex-col">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Top 5 Zonas (Mayor Venta)</h4>
                <div className="flex-1 flex items-center justify-center min-h-[220px]">
                  {productStats.zoneList.length > 0 ? (
                    <Chart options={productStats.barOptions} series={productStats.barSeries} type="bar" width="100%" height={220} />
                  ) : (
                    <p className="text-slate-600 text-xs">Sin ventas en el periodo filtrado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sellers List */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Detalle de Ventas por Vendedor</h4>
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto pr-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px] font-semibold">
                      <th className="pb-2 pr-3">Vendedor</th>
                      <th className="pb-2 pr-3 text-right">Ventas</th>
                      <th className="pb-2 text-right">Porcentaje de Venta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {productStats.sellerList.map((seller, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10">
                        <td className="py-2 pr-3 text-slate-300 font-medium">{seller.seller}</td>
                        <td className="py-2 pr-3 text-right text-slate-200 font-semibold">{formatCurrency(seller.sales)}</td>
                        <td className="py-2 text-right text-blue-400 font-bold">
                          {((seller.sales / productStats.totalSales) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistribucionNumerica;
