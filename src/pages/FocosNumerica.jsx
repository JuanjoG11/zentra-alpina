import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, ZONA_CIUDAD_MAP, ZONAS_POR_CIUDAD } from '../utils/calculations';
import { formatCurrency, formatPercent, formatShortCurrency, formatNumber, formatKg } from '../utils/formatters';
import GlassCard from '../components/ui/GlassCard';
import Chart from 'react-apexcharts';
import { BarChart3, CircleDollarSign, Sparkles, Search, X } from 'lucide-react';
import alpinaLogo from '../assets/alpina-logo.svg';

const BRAND_COLORS = [
  '#38bdf8','#818cf8','#34d399','#f59e0b','#f472b6',
  '#a78bfa','#fb923c','#2dd4bf','#e879f9','#4ade80',
  '#facc15','#60a5fa','#f87171','#c084fc','#86efac'
];

// Universo de clientes por zona — Focos Numérica junio 2026
const ZONE_UNIVERSE = {
  // ARMENIA — Juan José Guzmán (total: 1.777)
  'M9601': 359,  // Johanna Marcela
  'M9602': 338,  // Daniel
  'M9603': 334,  // Andrea
  'M9604': 270,  // Olga Patricia
  'M9605': 233,  // John Anderson
  'M9606': 243,  // Alejandra
  // PEREIRA — Diego González (total: 3.965)
  'M9453': 342,  // Lina Marcela
  'M9454': 311,  // Julian
  'M9455': 335,  // Genny
  'M9456': 302,  // Eliana
  'M9457': 293,  // German
  'M9458': 302,  // Natalia
  'M9459': 322,  // Yudi
  'M9460': 279,  // Alexander
  'M9461': 336,  // Yesica
  'P7004': 318,  // Valentina
  'P7005': 236,  // Jhonier Alejandro
  'P7006': 267,  // Cristian
  'P7007': 322,  // Duberney
  // MANIZALES — Bibiana Montoya (total: 2.111)
  'M9552': 251,  // Viviana
  'M9553': 287,  // Sindy Amaris
  'M9554': 267,  // Santiago
  'M9555': 276,  // Janneth
  'M9556': 289,  // Diana Milena
  'M9557': 246,  // Sandra Milena
  'M9558': 209,  // Beatriz Elena
  'M9559': 286,  // Alejandro
};

// Zonas de supermercados/grandes superficies — excluidas de cobertura numérica
const SUPERMARKET_ZONES = new Set([
  'P7008', 'P7009', 'P7010', // Armenia supermercados
  'M9550', 'M9560',           // Manizales supermercados
  'P7000', 'P7001', 'P7002',  // Pereira supermercados
  'E7000', 'E7001',           // Especiales
]);

const extractUnitWeightInGrams = (name) => {
  if (!name) return 0;
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|ml|l|kg)\b/i);
  if (match) {
    let value = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toLowerCase();
    if (unit === 'kg' || unit === 'l') {
      value *= 1000;
    }
    return value;
  }
  return 0;
};

const SedeProgressRing = ({ percentage, color = 'sky' }) => {
  const radius = 32;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const colorMap = {
    sky: {
      stroke: '#0ea5e9', // sky-500
      text: 'text-sky-400'
    },
    emerald: {
      stroke: '#10b981', // emerald-500
      text: 'text-emerald-400'
    },
    amber: {
      stroke: '#f59e0b', // amber-500
      text: 'text-amber-400'
    }
  };

  const selected = colorMap[color] || colorMap.sky;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#e2e8f0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={selected.stroke}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className={`absolute text-xs font-bold ${selected.text}`}>{Math.round(percentage)}%</span>
    </div>
  );
};

const FocosNumerica = () => {
  const filters = useStore();
  const dbData = useStore(state => state.dbData);
  const currentWorkDay = useStore(state => state.currentWorkDay);
  const globalCity = useStore(state => state.selectedCity);
  const setCity = useStore(state => state.setCity);
  const filteredData = getFilteredData(dbData, filters);

  const selectedPeriod = useStore(state => state.selectedPeriod);

  // ── Constantes del mes — conectadas al store ────────────────────────
  // Presupuesto y días hábiles según el período activo
  const PRESUPUESTO_POR_PERIODO = { '2026-06': 4210000000, '2026-07': 4210000000 };
  const DIAS_HABILES_POR_PERIODO = { '2026-06': 23, '2026-07': 23 };
  const PRESUPUESTO_MES = PRESUPUESTO_POR_PERIODO[selectedPeriod] || 4210000000;
  const DIAS_HABILES    = DIAS_HABILES_POR_PERIODO[selectedPeriod] || 23;

  // Nombre del mes en español para el banner
  const NOMBRE_MES = useMemo(() => {
    if (!selectedPeriod) return 'Julio 2026';
    const [year, month] = selectedPeriod.split('-');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[parseInt(month, 10) - 1]} ${year}`;
  }, [selectedPeriod]);

  // Día actual: usa el configurado manualmente; si es 0, detecta desde datos
  const detectedDay = useMemo(() => {
    const days = (dbData.salesDaily || [])
      .filter(d => d.fecha && d.fecha !== 'general' && !isNaN(new Date(d.fecha).getTime()));
    return days.length > 0 ? days.length : 1;
  }, [dbData.salesDaily]);

  const DIA_ACTUAL  = currentWorkDay > 0 ? currentWorkDay : detectedDay;
  const META_DIARIA = PRESUPUESTO_MES / DIAS_HABILES;
  const META_ACUMULADA = META_DIARIA * DIA_ACTUAL;

  // ── useState SIEMPRE antes de useMemo ───────────────────────────────
  // selectedCity derivado del store global (Topbar y dropdown local sincronizados)
  const selectedCity = (!globalCity || globalCity === 'Todas') ? 'ALL' : globalCity;
  const setSelectedCity = (val) => setCity(val === 'ALL' ? 'Todas' : val);

  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState('ventas');
  const [productSortDir, setProductSortDir] = useState('desc');
  const [expandedBrands, setExpandedBrands] = useState({});
  const [expandedFamilies, setExpandedFamilies] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const toggleBrand = (b) => setExpandedBrands(prev => ({ ...prev, [b]: !prev[b] }));
  const toggleFamily = (k) => setExpandedFamilies(prev => ({ ...prev, [k]: !prev[k] }));

  const zoneCity = (zona) => ZONA_CIUDAD_MAP[zona] || 'OTRO';

  const numericFocus = filteredData.zones.map((z) => ({
    ...z,
    city: zoneCity(z.zona),
    universeClients: ZONE_UNIVERSE[z.zona] || 0,
    coverage: z.presupuesto > 0 ? z.ventasNetas / z.presupuesto : 0,
    efficiency: z.facturas > 0 ? z.ventasNetas / z.facturas : 0,
    variance: z.porcentajeProyectado - 1
  }));

  const filteredByCity = useMemo(() => {
    if (selectedCity === 'ALL') return numericFocus;
    return numericFocus.filter((z) => z.city === selectedCity);
  }, [numericFocus, selectedCity]);

  // Solo zonas tradicionales (excluye supermercados) para métricas de cobertura numérica
  const traditionalZones = numericFocus.filter((z) => !SUPERMARKET_ZONES.has(z.zona));
  const traditionalByCity = filteredByCity.filter((z) => !SUPERMARKET_ZONES.has(z.zona));

  const totalFocusFacturas = filteredByCity.reduce((sum, z) => sum + z.facturas, 0);
  const totalNetSales = filteredByCity.reduce((sum, z) => sum + z.ventasNetas, 0);
  const totalBudget = filteredByCity.reduce((sum, z) => sum + z.presupuesto, 0);
  // Ventas brutas: suma de salesDaily (lo facturado antes de devoluciones)
  const totalGrossSales = (filteredData.salesDaily || []).reduce((sum, d) => sum + (d.total || 0), 0)
    || filteredData.providers.reduce((sum, p) => sum + p.ventas2026, 0);
  const avanceReal = totalGrossSales > 0 ? totalGrossSales : totalNetSales;
  const averageCoverage = traditionalZones.length > 0
    ? traditionalZones.reduce((sum, z) => sum + z.coverage, 0) / traditionalZones.length
    : 0;
  const salesGap = Math.max(0, totalBudget - totalNetSales);
  const averageInvoice = totalFocusFacturas > 0 ? totalNetSales / totalFocusFacturas : 0;
  const estimatedClientsToGoal = averageInvoice > 0 ? Math.ceil(salesGap / averageInvoice) : 0;
  const zonesBelowTarget = traditionalZones.filter((z) => z.coverage < 0.75).length;

  const citySummary = Object.values(filteredByCity.reduce((acc, z) => {
    const key = z.city;
    if (!acc[key]) {
      acc[key] = { city: key, presupuesto: 0, ventasNetas: 0, facturas: 0 };
    }
    acc[key].presupuesto += z.presupuesto;
    acc[key].ventasNetas += z.ventasNetas;
    acc[key].facturas += z.facturas;
    return acc;
  }, {})).map((city) => ({
    ...city,
    coverage: city.presupuesto > 0 ? city.ventasNetas / city.presupuesto : 0,
    facturasShare: totalFocusFacturas > 0 ? city.facturas / totalFocusFacturas : 0
  }));

  const cityClients = dbData.cityClients || {
    'ARMENIA': 1120,
    'MANIZALES': 1390,
    'PEREIRA': 2540
  };

  const cityGoalData = useMemo(() => [
    { city: 'ARMENIA', universeClients: 1777, metaClients: Math.round(1777 * 0.70), impactedClients: cityClients['ARMENIA'] || 0 },
    { city: 'MANIZALES', universeClients: 2111, metaClients: Math.round(2111 * 0.70), impactedClients: cityClients['MANIZALES'] || 0 },
    { city: 'PEREIRA', universeClients: 3965, metaClients: Math.round(3965 * 0.70), impactedClients: cityClients['PEREIRA'] || 0 }
  ].map((item) => ({
    ...item,
    numericalCoverage: item.universeClients > 0 ? item.impactedClients / item.universeClients : 0,
    clientsMissing: Math.max(0, item.metaClients - item.impactedClients)
  })), [cityClients]);

  const goalTotals = useMemo(() => cityGoalData.reduce((acc, item) => ({
    universeClients: acc.universeClients + item.universeClients,
    metaClients: acc.metaClients + item.metaClients,
    impactedClients: acc.impactedClients + item.impactedClients
  }), { universeClients: 0, metaClients: 0, impactedClients: 0 }), [cityGoalData]);

  const leaderCity = useMemo(() => {
    return cityGoalData.reduce((best, item) => {
      const bestCoverage = best ? best.impactedClients / best.universeClients : -1;
      const itemCoverage = item.universeClients > 0 ? item.impactedClients / item.universeClients : 0;
      return itemCoverage > bestCoverage ? item : best;
    }, null)?.city || 'ARMENIA';
  }, [cityGoalData]);

  const productImpactData = useMemo(() => {
    const rawProds = dbData.productDistrib || [];

    // Sin datos reales → lista vacía (nunca mostrar datos mock/inventados)
    if (rawProds.length === 0) return [];

    // Procesamiento de datos reales del cubo cargado
    const map = {};
    
    let filteredProds = rawProds;
    if (selectedCity && selectedCity !== 'ALL') {
      const zonasPermitidas = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
      filteredProds = filteredProds.filter(p => p.zona && zonasPermitidas.has(p.zona));
    }
    if (filters.selectedZone && filters.selectedZone !== 'Todas') {
      filteredProds = filteredProds.filter(p => p.zona === filters.selectedZone);
    }
    if (filters.selectedSeller && filters.selectedSeller !== 'Todas') {
      filteredProds = filteredProds.filter(p => p.vendedor === filters.selectedSeller);
    }

    filteredProds.forEach(p => {
      const code = p.nbProducto;
      let brandName = p.nmTpMarca || 'OTROS';
      const uBrand = brandName.toUpperCase();
      if (uBrand.includes('BON YURT') || uBrand.includes('BONYURT')) brandName = 'BON YURT';
      else if (uBrand.includes('FINESSE')) brandName = 'FINESSE';
      else if (uBrand.includes('YOGO')) brandName = 'YOGO YOGO';
      else if (uBrand.includes('YOX')) brandName = 'YOX';
      else if (uBrand.includes('ALPINITO')) brandName = 'ALPINITO';
      else if (uBrand.includes('ALPINETTE')) brandName = 'ALPINETTE';
      else if (uBrand.includes('ALPIN') && !uBrand.includes('ALPINA')) brandName = 'ALPIN';

      if (!map[code]) {
        map[code] = {
          nbProducto: p.nbProducto,
          nmProducto: p.nmProducto || 'Sin nombre',
          nmTpMarca: brandName,
          nmTpFamilia: p.nmTpFamilia || 'Sin familia',
          ventas: 0,
          facturas: 0,
          unidades: 0,
          // maxClientes: usamos el máximo de clientes entre zonas del mismo producto
          // (un cliente que compró en zona A y zona B es 1 cliente, no 2)
          maxClientes: 0,
          pesoTotal: 0
        };
      }
      map[code].ventas += p.ventas || 0;
      map[code].facturas += p.facturas || 0;
      map[code].unidades += p.unidades || 0;
      // Usar máximo en lugar de suma para evitar doble conteo inter-zonas
      const rowClientes = p.clientesCount !== undefined ? p.clientesCount : (p.facturas || 0);
      if (rowClientes > map[code].maxClientes) map[code].maxClientes = rowClientes;
      map[code].pesoTotal += p.pesoTotal || 0;
    });

    const universe = selectedCity === 'ALL' ? goalTotals.universeClients : (
      selectedCity === 'ARMENIA' ? 1777 : (
        selectedCity === 'MANIZALES' ? 2111 : (
          selectedCity === 'PEREIRA' ? 3965 : 100
        )
      )
    );

    return Object.values(map)
      .map(p => {
        const unitWeightG = extractUnitWeightInGrams(p.nmProducto);
        const pesoTotalKg = p.pesoTotal > 0 ? p.pesoTotal / 1000 : (unitWeightG * p.unidades) / 1000;
        const clientes = Math.min(universe, p.maxClientes);
        return {
          ...p,
          clientesCount: clientes,
          coverage: universe > 0 ? Math.min(1.0, clientes / universe) : 0,
          pesoTotalKg
        };
      })
      .sort((a, b) => b.ventas - a.ventas);
  }, [dbData.productDistrib, selectedCity, goalTotals, filters]);

  // Aggregated impact by brand and family
  const brandImpactData = useMemo(() => {
    const map = {};
    productImpactData.forEach(p => {
      const key = `${p.nmTpMarca}||${p.nmTpFamilia}`;
      if (!map[key]) {
        map[key] = {
          nmTpMarca: p.nmTpMarca,
          nmTpFamilia: p.nmTpFamilia,
          ventas: 0,
          facturas: 0,
          unidades: 0,
          // maxClientes: el mayor clientesCount de los productos de la familia
          // (el cliente que compró al menos un producto de la familia)
          maxClientes: 0
        };
      }
      map[key].ventas += p.ventas;
      map[key].facturas += p.facturas;
      map[key].unidades += p.unidades;
      // Usar máximo: un cliente que compró varios SKUs de la familia es 1 cliente impactado
      if (p.clientesCount > map[key].maxClientes) map[key].maxClientes = p.clientesCount;
    });
    const universe = selectedCity === 'ALL' ? goalTotals.universeClients : (
      selectedCity === 'ARMENIA' ? 1777 : (selectedCity === 'MANIZALES' ? 2111 : (selectedCity === 'PEREIRA' ? 3965 : 100))
    );
    return Object.values(map).map(b => ({
      ...b,
      clientesCount: b.maxClientes,
      coverage: universe > 0 ? Math.min(1.0, b.maxClientes / universe) : 0
    }));
  }, [productImpactData, selectedCity, goalTotals]);

  // Jerarquía Marca → Familia → Producto
  const hierarchyData = useMemo(() => {
    const universe = selectedCity === 'ALL' ? goalTotals.universeClients : (
      selectedCity === 'ARMENIA' ? 1777 : (selectedCity === 'MANIZALES' ? 2111 : (selectedCity === 'PEREIRA' ? 3965 : 100))
    );

    const brandMap = {};
    productImpactData.forEach(p => {
      const bk = p.nmTpMarca;
      const fk = `${p.nmTpMarca}||${p.nmTpFamilia}`;
      if (!brandMap[bk]) brandMap[bk] = { label: p.nmTpMarca, ventas: 0, facturas: 0, maxClientes: 0, pesoTotalKg: 0, families: {} };
      if (!brandMap[bk].families[fk]) brandMap[bk].families[fk] = { label: p.nmTpFamilia, ventas: 0, facturas: 0, maxClientes: 0, pesoTotalKg: 0, products: [] };

      brandMap[bk].families[fk].products.push(p);
      brandMap[bk].families[fk].ventas += p.ventas;
      brandMap[bk].families[fk].facturas += p.facturas;
      // Familia: el producto con más clientes representa la cobertura real de la familia
      if (p.clientesCount > brandMap[bk].families[fk].maxClientes)
        brandMap[bk].families[fk].maxClientes = p.clientesCount;
      brandMap[bk].families[fk].pesoTotalKg += p.pesoTotalKg || 0;

      brandMap[bk].ventas += p.ventas;
      brandMap[bk].facturas += p.facturas;
      // Marca: el producto con más clientes representa la cobertura real de la marca
      if (p.clientesCount > brandMap[bk].maxClientes)
        brandMap[bk].maxClientes = p.clientesCount;
      brandMap[bk].pesoTotalKg += p.pesoTotalKg || 0;
    });

    return Object.values(brandMap)
      .sort((a, b) => b.ventas - a.ventas)
      .map(brand => ({
        ...brand,
        clientesCount: brand.maxClientes,
        coverage: universe > 0 ? Math.min(1.0, brand.maxClientes / universe) : 0,
        families: Object.values(brand.families)
          .sort((a, b) => b.ventas - a.ventas)
          .map(fam => ({
            ...fam,
            clientesCount: fam.maxClientes,
            coverage: universe > 0 ? Math.min(1.0, fam.maxClientes / universe) : 0,
            products: [...fam.products].sort((a, b) => b.ventas - a.ventas)
          }))
      }));
  }, [productImpactData, selectedCity, goalTotals]);


  const filteredHierarchy = useMemo(() => {
    if (!productSearch.trim()) return hierarchyData;
    const q = productSearch.toLowerCase();
    return hierarchyData
      .map(brand => {
        const bMatch = brand.label.toLowerCase().includes(q);
        const filteredFamilies = brand.families
          .map(fam => {
            const fMatch = bMatch || fam.label.toLowerCase().includes(q);
            const filteredProds = fMatch ? fam.products : fam.products.filter(p =>
              p.nmProducto.toLowerCase().includes(q) || p.nbProducto?.toLowerCase().includes(q)
            );
            return filteredProds.length > 0 ? { ...fam, products: filteredProds } : null;
          })
          .filter(Boolean);
        return filteredFamilies.length > 0 ? { ...brand, families: filteredFamilies } : null;
      })
      .filter(Boolean);
  }, [hierarchyData, productSearch]);

  // ── Product Details Modal ───────────────────────────────────────────
  const rawProductDetails = useMemo(() => {
    if (!selectedProduct) return null;
    const rawProds = dbData.productDistrib || [];
    
    let filteredProds = rawProds;
    if (selectedCity && selectedCity !== 'ALL') {
      const zonasPermitidas = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
      filteredProds = filteredProds.filter(p => p.zona && zonasPermitidas.has(p.zona));
    }
    if (filters.selectedZone && filters.selectedZone !== 'Todas') {
      filteredProds = filteredProds.filter(p => p.zona === filters.selectedZone);
    }
    if (filters.selectedSeller && filters.selectedSeller !== 'Todas') {
      filteredProds = filteredProds.filter(p => p.vendedor === filters.selectedSeller);
    }
    
    return filteredProds.filter(p => p.nbProducto === selectedProduct.nbProducto);
  }, [dbData.productDistrib, selectedProduct, selectedCity, filters]);

  const productStats = useMemo(() => {
    if (!rawProductDetails || rawProductDetails.length === 0) return null;

    const totalSales = rawProductDetails.reduce((sum, p) => sum + (p.ventas || 0), 0);
    const totalUnits = rawProductDetails.reduce((sum, p) => sum + (p.unidades || 0), 0);
    const totalInvoices = rawProductDetails.reduce((sum, p) => sum + (p.facturas || 0), 0);
    const totalClients = rawProductDetails.reduce((sum, p) => sum + (p.clientesCount || 0), 0);
    const avgPrice = totalUnits > 0 ? totalSales / totalUnits : 0;

    // Sede Distribution
    const sedeMap = { ARMENIA: 0, MANIZALES: 0, PEREIRA: 0 };
    rawProductDetails.forEach(p => {
      const city = ZONA_CIUDAD_MAP[p.zona] || 'OTRO';
      if (sedeMap[city] !== undefined) {
        sedeMap[city] += p.ventas || 0;
      }
    });

    const activeSedes = Object.entries(sedeMap)
      .map(([name, sales]) => ({ name, sales }))
      .filter(s => s.sales > 0);

    const donutOptions = {
      chart: { type: 'donut', background: 'transparent', fontFamily: 'Inter, sans-serif' },
      colors: BRAND_COLORS,
      labels: activeSedes.map(s => s.name === 'MANIZALES' ? 'Eje Caldas' : s.name === 'ARMENIA' ? 'Eje Quindío' : 'Eje Risaralda'),
      dataLabels: { enabled: false },
      legend: { show: true, position: 'bottom', fontSize: '10px', labels: { colors: '#94a3b8' } },
      tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
      plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Ventas', color: '#94a3b8', formatter: () => formatShortCurrency(totalSales) } } } } }
    };
    const donutSeries = activeSedes.map(s => Math.round(s.sales));

    // Top Zones
    const zoneMap = {};
    rawProductDetails.forEach(p => {
      if (p.zona) { // Asegurarse de que zona existe
        zoneMap[p.zona] = (zoneMap[p.zona] || 0) + (p.ventas || 0);
      }
    });
    const zoneList = Object.entries(zoneMap)
      .map(([zona, sales]) => ({ zona: zona || 'Sin zona', sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const barOptions = {
      chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
      colors: ['#38bdf8'],
      dataLabels: { enabled: true, formatter: (val) => formatShortCurrency(val), style: { fontSize: '9px', colors: ['#94a3b8'] }, offsetX: 8 },
      xaxis: { categories: zoneList.map(z => z.zona || 'Sin zona'), labels: { show: false } },
      yaxis: { labels: { style: { fontSize: '10px', colors: '#94a3b8' } } },
      tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
      grid: { show: false }
    };
    const barSeries = [{ name: 'Ventas', data: zoneList.map(z => Math.round(z.sales)) }];

    // Top Sellers
    const sellerMap = {};
    rawProductDetails.forEach(p => {
      sellerMap[p.vendedor] = (sellerMap[p.vendedor] || 0) + (p.ventas || 0);
    });
    const sellerList = Object.entries(sellerMap)
      .map(([seller, sales]) => ({ seller, sales }))
      .sort((a, b) => b.sales - a.sales);

    const universe = selectedCity === 'ALL' ? goalTotals.universeClients : (
      selectedCity === 'ARMENIA' ? 1777 : (selectedCity === 'MANIZALES' ? 2111 : (selectedCity === 'PEREIRA' ? 3965 : 100))
    );
    const coverage = universe > 0 ? totalClients / universe : 0;

    return {
      totalSales,
      totalUnits,
      totalInvoices,
      totalClients,
      avgPrice,
      coverage,
      activeSedes,
      donutOptions,
      donutSeries,
      zoneList,
      barOptions,
      barSeries,
      sellerList
    };
  }, [rawProductDetails, selectedCity, goalTotals]);

  const filteredProducts = useMemo(() => {
    let list = productImpactData;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => 
        p.nmProducto.toLowerCase().includes(q) ||
        p.nbProducto.toLowerCase().includes(q) ||
        p.nmTpMarca.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const mul = productSortDir === 'desc' ? -1 : 1;
      if (productSortBy === 'ventas') return mul * (a.ventas - b.ventas);
      if (productSortBy === 'facturas') return mul * (a.facturas - b.facturas);
      if (productSortBy === 'clientes') return mul * (a.clientesCount - b.clientesCount);
      if (productSortBy === 'coverage') return mul * (a.coverage - b.coverage);
      if (productSortBy === 'nmProducto') return mul * a.nmProducto.localeCompare(b.nmProducto);
      return 0;
    });
  }, [productImpactData, productSearch, productSortBy, productSortDir]);

  const coverageSeries = [{
    name: 'Cobertura %',
    data: traditionalByCity.map((z) => Math.round(z.coverage * 100))
  }];

  const coverageOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#38bdf8'],
    plotOptions: { bar: { borderRadius: 10, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: traditionalByCity.map((z) => z.zona), labels: { rotate: -30, style: { fontSize: '10px' }, hideOverlappingLabels: true } },
    yaxis: { labels: { formatter: (val) => `${Math.round(val)}%` }, min: 0, max: 140 },
    tooltip: { theme: 'dark', y: { formatter: (val) => `${Math.round(val)}%` } },
    grid: { borderColor: '#1e293b' }
  };

  const efficiencySeries = [{
    name: 'Eficiencia',
    data: citySummary.map((c) => Math.round(c.ventasNetas / (c.facturas || 1)))
  }];

  const efficiencyOptions = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#f59e0b'],
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 4, colors: ['#f59e0b'] },
    dataLabels: { enabled: false },
    xaxis: { categories: citySummary.map((c) => c.city), labels: { style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: (val) => formatShortCurrency(val) } },
    tooltip: { theme: 'light', y: { formatter: (val) => formatCurrency(val) } },
    grid: { borderColor: '#e2e8f0' }
  };


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-xl shadow-sky-500/25">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <img src={alpinaLogo} alt="Alpina" className="h-9 w-auto" loading="lazy" />
                <div className="h-6 w-[1px] bg-slate-200"></div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Focos Numérica</h1>
                <span className="text-[9px] md:text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">Cobertura & Eficiencia</span>
              </div>
              <p className="text-slate-700 text-xs md:text-sm mt-1">
                Panel exclusivo de análisis de focos, cobertura y eficiencia por zona. Todo el insight financiero y operativo en un solo lugar.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-600">Filtrar ciudad:</label>
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-slate-100 text-slate-800 text-xs md:text-sm rounded px-2 py-1.5 border border-slate-200">
                  <option value="ALL">Todas</option>
                  <option value="ARMENIA">ARMENIA</option>
                  <option value="MANIZALES">MANIZALES</option>
                  <option value="PEREIRA">PEREIRA</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <GlassCard hoverable={false} className="bg-white border border-sky-500/20 p-4 md:p-5 shadow-[0_25px_80px_-45px_rgba(56,189,248,0.6)]">
          {/* Banner de avance del mes */}
          <div className="mb-4 pb-4 border-b border-slate-200">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Avance {NOMBRE_MES} · Día hábil {DIA_ACTUAL} de {DIAS_HABILES}</p>
                <p className="text-lg md:text-xl font-extrabold text-slate-900 mt-1">
                  Venta acumulada: <span className="text-sky-300 block sm:inline mt-1 sm:mt-0">{formatCurrency(avanceReal)}</span>
                </p>
                <p className="text-[10px] md:text-[11px] text-slate-600 mt-1 flex flex-wrap gap-1">
                  <span>Meta día {DIA_ACTUAL}: <span className={`font-semibold ${avanceReal >= META_ACUMULADA ? 'text-emerald-400' : 'text-rose-400'}`}>{formatShortCurrency(META_ACUMULADA)}</span></span>
                  <span className="hidden sm:inline">·</span>
                  <span className={avanceReal >= META_ACUMULADA ? 'text-emerald-400' : 'text-rose-400'}>
                    {avanceReal >= META_ACUMULADA
                      ? `✓ +${formatShortCurrency(avanceReal - META_ACUMULADA)} sobre meta`
                      : `Brecha: ${formatShortCurrency(META_ACUMULADA - avanceReal)}`}
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600">Progreso del mes</span>
                  <span className="text-sm font-bold text-sky-400">{DIA_ACTUAL}/{DIAS_HABILES} días</span>
                </div>
                <div className="w-full sm:w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
                    style={{ width: `${(DIA_ACTUAL / DIAS_HABILES) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-600">{Math.round((DIA_ACTUAL / DIAS_HABILES) * 100)}% del mes transcurrido</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-slate-600 text-xs md:text-sm">
              Esta sección destaca las zonas más críticas y las oportunidades de eficiencia con datos Alpina 100% filtrados. Faltan <strong className="text-slate-900">{formatNumber(estimatedClientsToGoal)}</strong> clientes de ticket promedio para cerrar la meta de presupuesto.
            </p>
            <div className="rounded-2xl md:rounded-3xl bg-white/80 border border-slate-200 p-3 md:p-4 flex items-center gap-3 w-fit">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-300" />
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-wider">Facturas de foco</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatNumber(totalFocusFacturas)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
          <GlassCard hoverable={false} className="bg-white border border-slate-200 p-3 md:p-4 shadow-lg shadow-slate-200/50">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">Cobertura promedio</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2">{formatPercent(averageCoverage)}</p>
            <p className="text-slate-600 text-[9px] md:text-[10px] mt-2">Porcentaje medio de ejecución de presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-white border border-slate-200 p-3 md:p-4 shadow-lg shadow-slate-200/50">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">Clientes faltantes</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2">{formatNumber(estimatedClientsToGoal)}</p>
            <p className="text-slate-600 text-[9px] md:text-[10px] mt-2">Estimado con ticket promedio actual</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-white border border-slate-200 p-3 md:p-4 shadow-lg shadow-slate-200/50">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">Brecha comercial</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2">{formatShortCurrency(salesGap)}</p>
            <p className="text-slate-600 text-[9px] md:text-[10px] mt-2">Ventas faltantes para presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-white border border-slate-200 p-3 md:p-4 shadow-lg shadow-slate-200/50">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider">Zonas en alerta</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900 mt-2">{zonesBelowTarget}</p>
            <p className="text-slate-600 text-[9px] md:text-[10px] mt-2">Zonas con cobertura menor al 75%</p>
          </GlassCard>
        </div>

        {/* Panel de Impacto de Ventas por Ciudad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cityGoalData.map((item, index) => {
            const isLeader = item.city === leaderCity;
            const progressPercent = item.universeClients > 0 ? (item.impactedClients / item.universeClients) * 100 : 0;
            const color = index === 0 ? 'sky' : index === 1 ? 'emerald' : 'amber';
            
            return (
              <GlassCard 
                key={item.city} 
                hoverable={true} 
                className="bg-white border border-slate-200 p-5 relative overflow-hidden group hover:border-slate-300/80 transition-all duration-300 shadow-md"
              >
                {/* Glow effect on hover */}
                <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none ${
                  color === 'sky' ? 'bg-sky-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />

                {isLeader && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm shadow-amber-500/5 animate-pulse">
                    <Sparkles className="h-2.5 w-2.5" />
                    Líder de Impacto
                  </span>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                      {item.city === 'ARMENIA' ? 'Eje Quindío' : item.city === 'MANIZALES' ? 'Eje Caldas' : 'Eje Risaralda'}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 tracking-tight">{item.city}</h4>
                  </div>
                  <SedeProgressRing percentage={progressPercent} color={color} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 text-center">
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">Universo</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">{formatNumber(item.universeClients)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">Impactados</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{formatNumber(item.impactedClients)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider">Por Impactar</p>
                    <p className="text-xs font-bold text-slate-600 mt-1">{formatNumber(Math.max(0, item.universeClients - item.impactedClients))}</p>
                  </div>
                </div>
                
                {/* Mini progress bar showing percentage of meta */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-600">Progreso vs Meta ({formatNumber(item.metaClients)})</span>
                    <span className="text-slate-700 font-bold">{Math.round((item.impactedClients / item.metaClients) * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        color === 'sky' ? 'bg-sky-400' : color === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (item.impactedClients / item.metaClients) * 100)}%` }}
                    />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard hoverable={false} className="bg-white border border-slate-200 p-4 md:p-5 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900">Cumplimiento por ciudad</h3>
              <p className="text-[10px] md:text-xs text-slate-600 mt-1">Universo de clientes, meta numérica (70% del universo) y faltantes por ciudad.</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-widest text-slate-600">Impacto Global</p>
              <p className="text-sm font-bold text-sky-400">{formatPercent(goalTotals.impactedClients / goalTotals.universeClients)}</p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
            <table className="w-full min-w-[600px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-[0.12em] text-[9px] md:text-[10px]">
                  <th className="pb-3 pr-3 md:pr-4">Ciudad</th>
                  <th className="pb-3 pr-3 md:pr-4">Universo</th>
                  <th className="pb-3 pr-3 md:pr-4">Meta (70%)</th>
                  <th className="pb-3 pr-3 md:pr-4">Impactados</th>
                  <th className="pb-3 pr-3 md:pr-4">Cobertura</th>
                  <th className="pb-3 pr-2">Faltan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cityGoalData.map((city) => (
                  <tr key={city.city} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-700 font-semibold text-xs md:text-sm">{city.city}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-600">{formatNumber(city.universeClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-700">{formatNumber(city.metaClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-700">{formatNumber(city.impactedClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 font-bold text-sky-700">{formatPercent(city.numericalCoverage)}</td>
                    <td className="py-2.5 pr-2 font-semibold text-rose-600">{formatNumber(city.clientsMissing)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td className="py-3 pr-3 md:pr-4 text-slate-900 font-black text-xs md:text-sm">Total</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-700">{formatNumber(goalTotals.universeClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-700">{formatNumber(goalTotals.metaClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-700">{formatNumber(goalTotals.impactedClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-sky-700 font-black">{formatPercent(goalTotals.impactedClients / goalTotals.universeClients)}</td>
                  <td className="py-3 pr-2 text-rose-600 font-bold">{formatNumber(Math.max(0, goalTotals.metaClients - goalTotals.impactedClients))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard hoverable={false} className="bg-white border border-slate-200 p-5 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cobertura por zona</h3>
              <p className="text-xs text-slate-600 mt-1">Análisis de riesgo presupuestal por zona.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-sky-400" />
          </div>
          <Chart options={coverageOptions} series={coverageSeries} type="bar" height={320} />
        </GlassCard>

        <GlassCard hoverable={false} className="bg-white border border-slate-200 p-5 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Eficiencia por ciudad</h3>
              <p className="text-xs text-slate-600 mt-1">Costo por factura y rendimiento operativo.</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <Chart options={efficiencyOptions} series={efficiencySeries} type="line" height={320} />
        </GlassCard>
      </div>


      <GlassCard hoverable={false} className="bg-white border border-slate-200 p-4 md:p-5 shadow-lg shadow-slate-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">Impacto Numérico · Marca / Familia / Producto</h3>
            <p className="text-[10px] md:text-xs text-slate-600 mt-1">
              Cobertura real de clientes únicos por nivel jerárquico sobre el universo de la sede seleccionada.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
            <input
              type="text"
              placeholder="Buscar marca, familia o producto..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 text-slate-900 text-xs rounded-lg pl-8 pr-10 py-2 outline-none focus:border-sky-500/50 transition-colors"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Header columns - Hidden on mobile, visible on md+ */}
        <div className="hidden md:flex items-center gap-4 px-4 pb-2 border-b border-slate-200 text-[9px] uppercase tracking-widest text-slate-600 font-semibold">
          <span className="flex-1 text-left">Nombre</span>
          <span className="w-32 text-right">Ventas</span>
          <span className="w-16 text-right">Facturas</span>
          <span className="w-20 text-right">Clientes</span>
          <span className="w-32 text-right">Cobertura</span>
          <span className="w-24 text-right">KG</span>
        </div>

        <div className="space-y-1 mt-2">
          {filteredHierarchy.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-600 text-sm font-semibold">Sin datos de distribución por producto</p>
              <p className="text-slate-600 text-xs mt-2">
                El cubo cargado no incluye columnas de producto (<span className="font-mono">nbProducto</span>, <span className="font-mono">nmTpMarca</span>, <span className="font-mono">nmTpFamilia</span>)
                o aún no se ha subido el archivo del período activo.
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Sube el cubo de ventas completo desde <span className="text-sky-600 font-semibold">Cargar Datos</span> para ver este análisis.
              </p>
            </div>
          )}
          {filteredHierarchy.map((brand, bi) => {
            const brandColor = BRAND_COLORS[bi % BRAND_COLORS.length];
            return (
              <div key={brand.label}>
               {/* ── MARCA ROW ── */}
              <button
                onClick={() => toggleBrand(brand.label)}
                className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300/40 transition-all group"
              >
                <span
                  className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shrink-0 transition-all duration-200 ring-2 ring-offset-1 ring-offset-slate-900"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: expandedBrands[brand.label] ? `0 0 8px ${brandColor}` : 'none',
                    ringColor: brandColor
                  }}
                />
                <span className="flex-1 text-left text-xs md:text-sm font-bold text-slate-900 tracking-wide truncate">{brand.label}</span>
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <span className="w-32 text-right text-slate-900 font-bold">{formatCurrency(brand.ventas)}</span>
                  <span className="w-16 text-right text-slate-700 font-semibold">{formatNumber(brand.facturas)}</span>
                  <span className="w-20 text-right text-sky-700 font-bold">{formatNumber(brand.clientesCount)}</span>
                  <div className="w-32 flex items-center justify-end gap-2">
                    <span className="text-sky-700 font-bold">{formatPercent(brand.coverage)}</span>
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, brand.coverage * 100)}%`, background: brand.coverage >= 0.7 ? '#10b981' : brand.coverage >= 0.4 ? '#0284c7' : '#f59e0b' }} />
                    </div>
                  </div>
                  <span className="w-24 text-right text-slate-700 font-semibold">{formatKg(brand.pesoTotalKg)}</span>
                </div>
                {/* Mobile summary */}
                <div className="flex md:hidden items-center gap-2 text-[10px]">
                  <span className="text-sky-700 font-bold">{formatPercent(brand.coverage)}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-700">{formatShortCurrency(brand.ventas)}</span>
                </div>
              </button>

              {/* ── FAMILIES ── */}
              {expandedBrands[brand.label] && (
                <div className="ml-4 mt-1 space-y-1">
                  {brand.families.map((fam, fi) => {
                    const fKey = `${brand.label}||${fam.label}`;
                    const famColor = BRAND_COLORS[(bi * 3 + fi + 5) % BRAND_COLORS.length];
                    return (
                      <div key={fKey}>
                        {/* Familia row */}
                        <button
                          onClick={() => toggleFamily(fKey)}
                          className="w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-slate-100/70 hover:bg-slate-100 border border-slate-300/30 transition-all"
                        >
                          <span
                            className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 transition-all duration-200"
                            style={{
                              backgroundColor: famColor,
                              boxShadow: expandedFamilies[fKey] ? `0 0 6px ${famColor}` : 'none'
                            }}
                          />
                          <span className="flex-1 text-left text-[11px] md:text-xs font-bold text-slate-900 truncate">{fam.label}</span>
                          <div className="hidden md:flex items-center gap-4 text-xs">
                            <span className="w-32 text-right text-slate-900 font-bold">{formatCurrency(fam.ventas)}</span>
                            <span className="w-16 text-right text-slate-700 font-medium">{formatNumber(fam.facturas)}</span>
                            <span className="w-20 text-right text-violet-700 font-semibold">{formatNumber(fam.clientesCount)}</span>
                            <div className="w-32 flex items-center justify-end gap-2">
                              <span className="text-violet-700 font-semibold">{formatPercent(fam.coverage)}</span>
                              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, fam.coverage * 100)}%` }} />
                              </div>
                            </div>
                            <span className="w-24 text-right text-slate-700 font-semibold">{formatKg(fam.pesoTotalKg)}</span>
                          </div>
                          {/* Mobile summary */}
                          <div className="flex md:hidden items-center gap-2 text-[10px]">
                            <span className="text-violet-700 font-semibold">{formatPercent(fam.coverage)}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-700">{formatShortCurrency(fam.ventas)}</span>
                          </div>
                        </button>

                        {/* ── PRODUCTOS ── */}
                        {expandedFamilies[fKey] && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {fam.products.map((p, i) => (
                              <div 
                                key={`${p.nbProducto}-${i}`} 
                                onClick={() => setSelectedProduct(p)}
                                className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-300/30 cursor-pointer group"
                              >
                                <span className="text-[9px] md:text-[10px] font-mono text-slate-600 w-10 md:w-12 shrink-0">{p.nbProducto}</span>
                                <span className="flex-1 text-[11px] md:text-xs text-slate-900 font-semibold truncate max-w-[150px] md:max-w-[220px] group-hover:text-sky-600 transition-colors">{p.nmProducto}</span>
                                <div className="hidden md:flex items-center gap-4 text-xs">
                                  <span className="w-32 text-right text-slate-900 font-bold">{formatCurrency(p.ventas)}</span>
                                  <span className="w-16 text-right text-slate-700">{formatNumber(p.facturas)}</span>
                                  <span className="w-20 text-right text-slate-900 font-bold">{formatNumber(p.clientesCount)}</span>
                                  <div className="w-32 flex items-center justify-end gap-2">
                                    <span className="text-emerald-700 font-bold">{formatPercent(p.coverage)}</span>
                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, p.coverage * 100)}%` }} />
                                    </div>
                                  </div>
                                  <span className="w-24 text-right text-slate-700 font-medium">{formatKg(p.pesoTotalKg)}</span>
                                </div>
                                {/* Mobile summary */}
                                <div className="flex md:hidden items-center gap-1.5 text-[10px] shrink-0">
                                  <span className="text-teal-300 font-bold">{formatPercent(p.coverage)}</span>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-slate-700">{formatShortCurrency(p.ventas)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}

        </div>
      </GlassCard>

      {/* Product Detail Modal */}
      {selectedProduct && productStats && (
        <div 
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-white/80 backdrop-blur-sm transition-opacity overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-100 border border-slate-200 rounded-xl md:rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-4 md:p-6 relative flex flex-col gap-4 md:gap-6 text-slate-700 my-auto"
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute right-2 top-2 md:right-4 md:top-4 text-slate-600 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer z-10"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Header */}
            <div className="pr-8">
              <span className="text-[9px] md:text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-bold uppercase tracking-wider">
                Ficha de Producto · Focos Numérica
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-3">{selectedProduct.nmProducto}</h2>
              <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 mt-1.5 text-[10px] md:text-xs text-slate-600">
                <span>Código: <strong className="font-mono text-slate-700">{selectedProduct.nbProducto}</strong></span>
                <span>·</span>
                <span>Marca: <strong className="text-slate-700">{selectedProduct.nmTpMarca}</strong></span>
                <span>·</span>
                <span>Familia: <strong className="text-slate-700">{selectedProduct.nmTpFamilia}</strong></span>
              </div>
            </div>

            {/* KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
              {[
                { label: 'Ventas del Producto', value: formatShortCurrency(productStats.totalSales), color: 'text-sky-400' },
                { label: 'Unidades Vendidas', value: formatNumber(productStats.totalUnits), color: 'text-amber-400' },
                { label: 'Facturas', value: formatNumber(productStats.totalInvoices), color: 'text-emerald-400' },
                { label: 'Clientes Únicos', value: formatNumber(productStats.totalClients), color: 'text-violet-400' },
                { label: 'Cobertura Numérica', value: formatPercent(productStats.coverage), color: 'text-teal-400' }
              ].map((kpi, idx) => (
                <div key={idx} className="bg-white/40 border border-slate-200 rounded-lg md:rounded-xl p-2.5 md:p-3.5 flex flex-col gap-0.5 md:gap-1">
                  <span className="text-[9px] md:text-[10px] text-slate-600 uppercase tracking-wider font-semibold line-clamp-2">{kpi.label}</span>
                  <span className={`text-base md:text-lg font-bold ${kpi.color} mt-0.5`}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="bg-white/40 border border-slate-200 rounded-lg md:rounded-xl p-3 md:p-4">
              <h4 className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 md:mb-3">Información Adicional</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-[11px] md:text-xs">
                <div>
                  <span className="text-slate-600">Precio Promedio Unitario</span>
                  <p className="text-slate-900 font-bold mt-1">{formatCurrency(productStats.avgPrice)}</p>
                </div>
                <div>
                  <span className="text-slate-600">Peso Total</span>
                  <p className="text-slate-900 font-bold mt-1">{formatKg(selectedProduct.pesoTotalKg || 0)}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-slate-600">Ticket Promedio</span>
                  <p className="text-slate-900 font-bold mt-1">{formatCurrency(productStats.totalInvoices > 0 ? productStats.totalSales / productStats.totalInvoices : 0)}</p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Sede Donut */}
              <div className="bg-white/40 border border-slate-200 rounded-lg md:rounded-xl p-4 md:p-5 flex flex-col">
                <h4 className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 md:mb-4">Ventas por Sede (Eje)</h4>
                <div className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[220px]">
                  {productStats.activeSedes.length > 0 ? (
                    <Chart options={productStats.donutOptions} series={productStats.donutSeries} type="donut" width="100%" height={200} />
                  ) : (
                    <p className="text-slate-600 text-xs">Sin ventas en el periodo filtrado</p>
                  )}
                </div>
              </div>

              {/* Zones Bar */}
              <div className="bg-white/40 border border-slate-200 rounded-lg md:rounded-xl p-4 md:p-5 flex flex-col">
                <h4 className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 md:mb-4">Top 5 Zonas por Ventas</h4>
                <div className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[220px]">
                  {productStats.zoneList.length > 0 ? (
                    <Chart options={productStats.barOptions} series={productStats.barSeries} type="bar" width="100%" height={200} />
                  ) : (
                    <p className="text-slate-600 text-xs">Sin datos de zonas</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Sellers Table */}
            {productStats.sellerList.length > 0 && (
              <div className="bg-white/40 border border-slate-200 rounded-lg md:rounded-xl p-4 md:p-5">
                <h4 className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 md:mb-4">Top Vendedores</h4>
                <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
                  <table className="w-full min-w-[400px] text-[11px] md:text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[9px] md:text-[10px]">
                        <th className="pb-2 pr-3 md:pr-4 text-left font-semibold">Vendedor</th>
                        <th className="pb-2 pr-3 md:pr-4 text-right font-semibold">Ventas</th>
                        <th className="pb-2 text-right font-semibold">Participación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {productStats.sellerList.slice(0, 10).map((seller, idx) => (
                        <tr key={idx} className="hover:bg-slate-200/20 transition-colors">
                          <td className="py-2 pr-3 md:pr-4 text-slate-900 font-bold truncate max-w-[150px]">{seller.seller}</td>
                          <td className="py-2 pr-3 md:pr-4 text-right text-slate-900 font-semibold whitespace-nowrap">{formatShortCurrency(seller.sales)}</td>
                          <td className="py-2 text-right text-sky-700 font-bold">{formatPercent(seller.sales / productStats.totalSales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FocosNumerica;
