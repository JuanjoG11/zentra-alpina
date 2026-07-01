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
          stroke="#1e293b"
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

  // ── Constantes del mes — conectadas al store ────────────────────────
  const PRESUPUESTO_MES = 4001885288;
  const DIAS_HABILES    = 22; // Días hábiles reales de junio 2026

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
    coverage: z.presupuesto > 0 ? z.ventasNetas / z.presupuesto : 0,
    efficiency: z.facturas > 0 ? z.ventasNetas / z.facturas : 0,
    variance: z.porcentajeProyectado - 1
  }));

  const filteredByCity = useMemo(() => {
    if (selectedCity === 'ALL') return numericFocus;
    return numericFocus.filter((z) => z.city === selectedCity);
  }, [numericFocus, selectedCity]);

  const totalFocusFacturas = filteredByCity.reduce((sum, z) => sum + z.facturas, 0);
  const totalNetSales = filteredByCity.reduce((sum, z) => sum + z.ventasNetas, 0);
  const totalBudget = filteredByCity.reduce((sum, z) => sum + z.presupuesto, 0);
  const averageCoverage = numericFocus.length > 0
    ? numericFocus.reduce((sum, z) => sum + z.coverage, 0) / numericFocus.length
    : 0;
  const salesGap = Math.max(0, totalBudget - totalNetSales);
  const averageInvoice = totalFocusFacturas > 0 ? totalNetSales / totalFocusFacturas : 0;
  const estimatedClientsToGoal = averageInvoice > 0 ? Math.ceil(salesGap / averageInvoice) : 0;
  const zonesBelowTarget = numericFocus.filter((z) => z.coverage < 0.75).length;

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
    
    // Fallback mock products if empty
    if (rawProds.length === 0) {
      const mockProducts = [
        { nbProducto: '10001', nmProducto: 'Alpin Chocolate 200g', nmTpMarca: 'ALPIN', nmTpFamilia: 'LÁCTEOS INFANTILES', ventas: 8400000, facturas: 540, unidades: 1200, clientesCount: 490 },
        { nbProducto: '10002', nmProducto: 'Yogurt Finesse Fresa 150g', nmTpMarca: 'FINESSE', nmTpFamilia: 'YOGURES DIETÉTICOS', ventas: 9500000, facturas: 610, unidades: 1400, clientesCount: 520 },
        { nbProducto: '10003', nmProducto: 'Yogurt Alpina Melocotón 150g', nmTpMarca: 'YOGURT ALPINA', nmTpFamilia: 'YOGURES CULTIVADOS', ventas: 18000000, facturas: 1200, unidades: 2800, clientesCount: 950 },
        { nbProducto: '10004', nmProducto: 'Avena Alpina Original 250ml', nmTpMarca: 'AVENA ALPINA', nmTpFamilia: 'BEBIDAS', ventas: 15000000, facturas: 950, unidades: 2200, clientesCount: 810 },
        { nbProducto: '10005', nmProducto: 'Kumis Alpina Vaso 150g', nmTpMarca: 'KUMIS ALPINA', nmTpFamilia: 'KUMIS', ventas: 7200000, facturas: 480, unidades: 1100, clientesCount: 410 },
        { nbProducto: '10006', nmProducto: 'Bon Yurt Cereal 170g', nmTpMarca: 'BON YURT', nmTpFamilia: 'CEREALES', ventas: 24000000, facturas: 1500, unidades: 3500, clientesCount: 1200 },
        { nbProducto: '10007', nmProducto: 'Alpinito Fresa 45g', nmTpMarca: 'ALPINITO', nmTpFamilia: 'PETIT SUISSE', ventas: 6800000, facturas: 460, unidades: 1050, clientesCount: 390 },
        { nbProducto: '10008', nmProducto: 'Yogo Yogo Fresa Bolsa 150g', nmTpMarca: 'YOGO YOGO', nmTpFamilia: 'YOGURES INFANTILES', ventas: 11000000, facturas: 720, unidades: 1650, clientesCount: 610 },
        { nbProducto: '10009', nmProducto: 'Queso Parmesano Rallado 100g', nmTpMarca: 'QUESO PARMESANO', nmTpFamilia: 'QUESOS MADUROS', ventas: 13500000, facturas: 850, unidades: 1950, clientesCount: 720 },
        { nbProducto: '10010', nmProducto: 'Yox con Probióticos 100ml', nmTpMarca: 'YOX', nmTpFamilia: 'FUNCIONALES', ventas: 19500000, facturas: 1300, unidades: 3000, clientesCount: 1100 },
        { nbProducto: '10011', nmProducto: 'Alpinette Fresa 150g', nmTpMarca: 'ALPINETTE', nmTpFamilia: 'POSTRES', ventas: 5800000, facturas: 390, unidades: 900, clientesCount: 320 },
        { nbProducto: '10012', nmProducto: 'Gelatina Boggy Fresa 120g', nmTpMarca: 'GELATINA BOGGY', nmTpFamilia: 'POSTRES INFANTILES', ventas: 4500000, facturas: 310, unidades: 700, clientesCount: 250 },
        { nbProducto: '10013', nmProducto: 'Leche Entera Bolsa 900ml', nmTpMarca: 'LECHE ALPINA BOLSA', nmTpFamilia: 'LECHES UHT', ventas: 42000000, facturas: 2400, unidades: 6200, clientesCount: 1900 },
        { nbProducto: '10014', nmProducto: 'Queso Mozzarella Bloque 500g', nmTpMarca: 'QUESO MOZARELLA', nmTpFamilia: 'QUESOS FRESCOS', ventas: 28000000, facturas: 1600, unidades: 4100, clientesCount: 1350 },
        { nbProducto: '10015', nmProducto: 'Mantequilla con Sal 125g', nmTpMarca: 'MANTEQUILLA', nmTpFamilia: 'GRASAS', ventas: 9200000, facturas: 580, unidades: 1350, clientesCount: 480 },
        { nbProducto: '10016', nmProducto: 'Leche Entera Caja 1L', nmTpMarca: 'LECHE ALPINA CAJA', nmTpFamilia: 'LECHES CAJA', ventas: 34000000, facturas: 1900, unidades: 4800, clientesCount: 1550 },
        { nbProducto: '10017', nmProducto: 'Arequipe Alpina 220g', nmTpMarca: 'AREQUIPE ALPINA', nmTpFamilia: 'DULCES', ventas: 12000000, facturas: 780, unidades: 1800, clientesCount: 640 },
        { nbProducto: '10018', nmProducto: 'Mini Bon Yurt Zucaritas 100g', nmTpMarca: 'MINI BONYURT', nmTpFamilia: 'CEREALES INFANTILES', ventas: 5200000, facturas: 360, unidades: 820, clientesCount: 290 },
        { nbProducto: '10019', nmProducto: 'Yogur Griego Natural 150g', nmTpMarca: 'YOGURT GRIEGO', nmTpFamilia: 'GRIEGO', ventas: 14500000, facturas: 920, unidades: 2150, clientesCount: 760 },
        { nbProducto: '10020', nmProducto: 'Cremosino Alpina 200g', nmTpMarca: 'CREMOSINO', nmTpFamilia: 'QUESOS UNTABLES', ventas: 8100000, facturas: 520, unidades: 1200, clientesCount: 420 },
        { nbProducto: '10021', nmProducto: 'Crema de Leche Bolsa 200g', nmTpMarca: 'CREMA DE LECHE', nmTpFamilia: 'CREMAS', ventas: 16500000, facturas: 1050, unidades: 2450, clientesCount: 880 },
        { nbProducto: '10022', nmProducto: 'Kefir Alpina Natural 150g', nmTpMarca: 'KEFIR ALPINA', nmTpFamilia: 'FUNCIONALES', ventas: 3800000, facturas: 250, unidades: 560, clientesCount: 210 },
        { nbProducto: '10023', nmProducto: 'Regeneris Fresa 150g', nmTpMarca: 'REGENERIS', nmTpFamilia: 'FUNCIONALES', ventas: 8900000, facturas: 570, unidades: 1300, clientesCount: 470 },
        { nbProducto: '10024', nmProducto: 'Queso Finesse Bloque 250g', nmTpMarca: 'FINESSE', nmTpFamilia: 'QUESOS DIETÉTICOS', ventas: 10500000, facturas: 680, unidades: 1550, clientesCount: 550 },
        { nbProducto: '10025', nmProducto: 'Avena Finesse Canela 250ml', nmTpMarca: 'FINESSE', nmTpFamilia: 'BEBIDAS DIETÉTICAS', ventas: 6200000, facturas: 410, unidades: 920, clientesCount: 330 },
        { nbProducto: '10026', nmProducto: 'Queso Sabana Tajado 200g', nmTpMarca: 'QUESO SABANA', nmTpFamilia: 'QUESOS FRESCOS', ventas: 11800000, facturas: 740, unidades: 1720, clientesCount: 600 },
        { nbProducto: '10027', nmProducto: 'Arepa Blanca Don Maíz x5', nmTpMarca: 'DON MAIZ', nmTpFamilia: 'AREPAS', ventas: 15200000, facturas: 980, unidades: 2300, clientesCount: 780 },
        { nbProducto: '10028', nmProducto: 'Leche Actilife Deslactosada 1L', nmTpMarca: 'ACTILIFE', nmTpFamilia: 'FUNCIONALES', ventas: 13400000, facturas: 870, unidades: 2000, clientesCount: 690 },
        { nbProducto: '10029', nmProducto: 'Quesito Alpina 200g', nmTpMarca: 'QUESITO ALPINA', nmTpFamilia: 'QUESOS FRESCOS', ventas: 7400000, facturas: 490, unidades: 1150, clientesCount: 390 },
        { nbProducto: '10030', nmProducto: 'Queso Holandés Bloque 250g', nmTpMarca: 'QUESO HOLANDES', nmTpFamilia: 'QUESOS MADUROS', ventas: 12400000, facturas: 790, unidades: 1850, clientesCount: 630 },
        { nbProducto: '10031', nmProducto: 'Baby Gu Manzana Vaso 100g', nmTpMarca: 'BABY GU', nmTpFamilia: 'LÁCTEOS INFANTILES', ventas: 2800000, facturas: 190, unidades: 420, clientesCount: 150 },
        { nbProducto: '10032', nmProducto: 'Alimento Mascotas Alpina 1kg', nmTpMarca: 'MASCOTAS', nmTpFamilia: 'MASCOTAS', ventas: 3100000, facturas: 210, unidades: 460, clientesCount: 160 },
        { nbProducto: '10033', nmProducto: 'Frutto Durazno Caja 1L', nmTpMarca: 'FRUTTO', nmTpFamilia: 'JUGOS', ventas: 9800000, facturas: 630, unidades: 1450, clientesCount: 510 },
        { nbProducto: '10034', nmProducto: 'Queso Campesino Alpina 500g', nmTpMarca: 'QUESO CAMPESINO', nmTpFamilia: 'QUESOS FRESCOS', ventas: 10200000, facturas: 650, unidades: 1500, clientesCount: 530 },
        { nbProducto: '10035', nmProducto: 'Mermelada Mora 200g', nmTpMarca: 'MERMELADA', nmTpFamilia: 'DULCES', ventas: 4100000, facturas: 280, unidades: 620, clientesCount: 220 }
      ];
      
      const globalUniverse = goalTotals.universeClients;
      return mockProducts.map(p => {
        let factor = 1;
        if (selectedCity === 'ARMENIA') factor = 1777 / 7853;
        else if (selectedCity === 'MANIZALES') factor = 2111 / 7853;
        else if (selectedCity === 'PEREIRA') factor = 3965 / 7853;
        else if (selectedCity === 'OTRO') factor = 0.05;
        
        const universe = selectedCity === 'ALL' ? globalUniverse : (
          selectedCity === 'ARMENIA' ? 1777 : (
            selectedCity === 'MANIZALES' ? 2111 : (
              selectedCity === 'PEREIRA' ? 3965 : 100
            )
          )
        );
        
        const adjustedClients = Math.round(p.clientesCount * factor);
        const adjUnidades = Math.round(p.unidades * factor);
        const unitWeightG = extractUnitWeightInGrams(p.nmProducto);
        const pesoTotalKg = (unitWeightG * adjUnidades) / 1000;
        
        return {
          ...p,
          ventas: Math.round(p.ventas * factor),
          facturas: Math.round(p.facturas * factor),
          unidades: adjUnidades,
          clientesCount: adjustedClients,
          coverage: universe > 0 ? adjustedClients / universe : 0,
          pesoTotalKg
        };
      });
    }

    // Dynamic processing of real uploaded product data
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
      if (!map[code]) {
        map[code] = {
          nbProducto: p.nbProducto,
          nmProducto: p.nmProducto || 'Sin nombre',
          nmTpMarca: p.nmTpMarca || 'OTROS',
          nmTpFamilia: p.nmTpFamilia || 'Sin familia',
          ventas: 0,
          facturas: 0,
          unidades: 0,
          clientesCount: 0,
          pesoTotal: 0
        };
      }
      map[code].ventas += p.ventas || 0;
      map[code].facturas += p.facturas || 0;
      map[code].unidades += p.unidades || 0;
      map[code].clientesCount += p.clientesCount !== undefined ? p.clientesCount : (p.facturas || 0);
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
        return {
          ...p,
          clientesCount: Math.min(universe, p.clientesCount),
          coverage: universe > 0 ? Math.min(universe, p.clientesCount) / universe : 0,
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
          clientesCount: 0
        };
      }
      map[key].ventas += p.ventas;
      map[key].facturas += p.facturas;
      map[key].unidades += p.unidades;
      map[key].clientesCount += p.clientesCount;
    });
    const universe = selectedCity === 'ALL' ? goalTotals.universeClients : (
      selectedCity === 'ARMENIA' ? 1777 : (selectedCity === 'MANIZALES' ? 2111 : (selectedCity === 'PEREIRA' ? 3965 : 100))
    );
    return Object.values(map).map(b => ({
      ...b,
      coverage: universe > 0 ? b.clientesCount / universe : 0
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
      if (!brandMap[bk]) brandMap[bk] = { label: p.nmTpMarca, ventas: 0, facturas: 0, clientesCount: 0, pesoTotalKg: 0, families: {} };
      if (!brandMap[bk].families[fk]) brandMap[bk].families[fk] = { label: p.nmTpFamilia, ventas: 0, facturas: 0, clientesCount: 0, pesoTotalKg: 0, products: [] };
      brandMap[bk].families[fk].products.push(p);
      brandMap[bk].families[fk].ventas += p.ventas;
      brandMap[bk].families[fk].facturas += p.facturas;
      brandMap[bk].families[fk].clientesCount += p.clientesCount;
      brandMap[bk].families[fk].pesoTotalKg += p.pesoTotalKg || 0;
      brandMap[bk].ventas += p.ventas;
      brandMap[bk].facturas += p.facturas;
      brandMap[bk].clientesCount += p.clientesCount;
      brandMap[bk].pesoTotalKg += p.pesoTotalKg || 0;
    });

    return Object.values(brandMap)
      .sort((a, b) => b.ventas - a.ventas)
      .map(brand => ({
        ...brand,
        coverage: universe > 0 ? brand.clientesCount / universe : 0,
        families: Object.values(brand.families)
          .sort((a, b) => b.ventas - a.ventas)
          .map(fam => ({
            ...fam,
            coverage: universe > 0 ? fam.clientesCount / universe : 0,
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
      zoneMap[p.zona] = (zoneMap[p.zona] || 0) + (p.ventas || 0);
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
    data: filteredByCity.map((z) => Math.round(z.coverage * 100))
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
    xaxis: { categories: filteredByCity.map((z) => z.zona), labels: { rotate: -30, style: { fontSize: '10px' }, hideOverlappingLabels: true } },
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
    tooltip: { theme: 'dark', y: { formatter: (val) => formatCurrency(val) } },
    grid: { borderColor: '#1e293b' }
  };


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-slate-950/70 border border-slate-800 px-4 py-2 shadow-lg shadow-slate-950/20 w-fit">
            <img src={alpinaLogo} alt="Alpina" className="h-9 w-auto" loading="lazy" />
            <span className="text-slate-300 text-sm uppercase tracking-[0.25em]">Focos Numérica</span>
          </div>
          <div className="max-w-full">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Inteligencia numérica Alpina</h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1">
              Panel exclusivo de análisis de focos, cobertura y eficiencia por zona. Todo el insight financiero y operativo en un solo lugar.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-400">Filtrar ciudad:</label>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="bg-slate-900 text-slate-200 text-xs md:text-sm rounded px-2 py-1.5 border border-slate-800">
                <option value="ALL">Todas</option>
                <option value="ARMENIA">ARMENIA</option>
                <option value="MANIZALES">MANIZALES</option>
                <option value="PEREIRA">PEREIRA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
          </div>
        </div>

        <GlassCard hoverable={false} className="bg-slate-950/70 border border-sky-500/20 p-4 md:p-5 shadow-[0_25px_80px_-45px_rgba(56,189,248,0.6)]">
          {/* Banner de avance del mes */}
          <div className="mb-4 pb-4 border-b border-slate-800/60">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Avance Junio 2026 · Día hábil {DIA_ACTUAL} de {DIAS_HABILES}</p>
                <p className="text-lg md:text-xl font-extrabold text-white mt-1">
                  Meta acumulada: <span className="text-sky-300 block sm:inline mt-1 sm:mt-0">{formatCurrency(META_ACUMULADA)}</span>
                </p>
                <p className="text-[10px] md:text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1">
                  <span>Presupuesto total: <span className="text-slate-200 font-semibold">{formatShortCurrency(PRESUPUESTO_MES)}</span></span>
                  <span className="hidden sm:inline">·</span>
                  <span>Meta diaria: <span className="text-slate-200 font-semibold">{formatShortCurrency(META_DIARIA)}</span></span>
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Progreso del mes</span>
                  <span className="text-sm font-bold text-sky-400">{DIA_ACTUAL}/{DIAS_HABILES} días</span>
                </div>
                <div className="w-full sm:w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all"
                    style={{ width: `${(DIA_ACTUAL / DIAS_HABILES) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{Math.round((DIA_ACTUAL / DIAS_HABILES) * 100)}% del mes transcurrido</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-slate-400 text-xs md:text-sm">
              Esta sección destaca las zonas más críticas y las oportunidades de eficiencia con datos Alpina 100% filtrados. Faltan <strong className="text-white">{formatNumber(estimatedClientsToGoal)}</strong> clientes de ticket promedio para cerrar la meta de presupuesto.
            </p>
            <div className="rounded-2xl md:rounded-3xl bg-slate-950/60 border border-slate-800 p-3 md:p-4 flex items-center gap-3 w-fit">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-amber-300" />
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wider">Facturas de foco</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-1">{formatNumber(totalFocusFacturas)}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-3 md:p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Cobertura promedio</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-2">{formatPercent(averageCoverage)}</p>
            <p className="text-slate-500 text-[9px] md:text-[10px] mt-2">Porcentaje medio de ejecución de presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-3 md:p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Clientes faltantes</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-2">{formatNumber(estimatedClientsToGoal)}</p>
            <p className="text-slate-500 text-[9px] md:text-[10px] mt-2">Estimado con ticket promedio actual</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-3 md:p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Brecha comercial</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-2">{formatShortCurrency(salesGap)}</p>
            <p className="text-slate-500 text-[9px] md:text-[10px] mt-2">Ventas faltantes para presupuesto</p>
          </GlassCard>
          <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-3 md:p-4 shadow-lg shadow-slate-950/20">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider">Zonas en alerta</p>
            <p className="text-xl md:text-2xl font-bold text-white mt-2">{zonesBelowTarget}</p>
            <p className="text-slate-500 text-[9px] md:text-[10px] mt-2">Zonas con cobertura menor al 75%</p>
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
                className="bg-slate-950/70 border border-slate-800/80 p-5 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-300 shadow-md"
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
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                      {item.city === 'ARMENIA' ? 'Eje Quindío' : item.city === 'MANIZALES' ? 'Eje Caldas' : 'Eje Risaralda'}
                    </span>
                    <h4 className="text-lg font-bold text-white tracking-tight">{item.city}</h4>
                  </div>
                  <SedeProgressRing percentage={progressPercent} color={color} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-900/60 text-center">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Universo</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">{formatNumber(item.universeClients)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Impactados</p>
                    <p className="text-xs font-bold text-white mt-1">{formatNumber(item.impactedClients)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Por Impactar</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{formatNumber(Math.max(0, item.universeClients - item.impactedClients))}</p>
                  </div>
                </div>
                
                {/* Mini progress bar showing percentage of meta */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Progreso vs Meta ({formatNumber(item.metaClients)})</span>
                    <span className="text-slate-300 font-bold">{Math.round((item.impactedClients / item.metaClients) * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
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

        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 md:p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm md:text-base font-bold text-white">Cumplimiento por ciudad</h3>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1">Universo de clientes, meta numérica (70% del universo) y faltantes por ciudad.</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Impacto Global</p>
              <p className="text-sm font-bold text-sky-400">{formatPercent(goalTotals.impactedClients / goalTotals.universeClients)}</p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
            <table className="w-full min-w-[600px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-[0.12em] text-[9px] md:text-[10px]">
                  <th className="pb-3 pr-3 md:pr-4">Ciudad</th>
                  <th className="pb-3 pr-3 md:pr-4">Universo</th>
                  <th className="pb-3 pr-3 md:pr-4">Meta (70%)</th>
                  <th className="pb-3 pr-3 md:pr-4">Impactados</th>
                  <th className="pb-3 pr-3 md:pr-4">Cobertura</th>
                  <th className="pb-3 pr-2">Faltan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {cityGoalData.map((city) => (
                  <tr key={city.city} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-300 font-semibold text-xs md:text-sm">{city.city}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-400">{formatNumber(city.universeClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-300">{formatNumber(city.metaClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 text-slate-300">{formatNumber(city.impactedClients)}</td>
                    <td className="py-2.5 pr-3 md:pr-4 font-bold text-slate-100">{formatPercent(city.numericalCoverage)}</td>
                    <td className="py-2.5 pr-2 text-slate-100">{formatNumber(city.clientsMissing)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900/40">
                  <td className="py-3 pr-3 md:pr-4 text-slate-200 font-semibold text-xs md:text-sm">Total</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-200">{formatNumber(goalTotals.universeClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-200">{formatNumber(goalTotals.metaClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-200">{formatNumber(goalTotals.impactedClients)}</td>
                  <td className="py-3 pr-3 md:pr-4 text-slate-100 font-bold">{formatPercent(goalTotals.impactedClients / goalTotals.universeClients)}</td>
                  <td className="py-3 pr-2 text-slate-100">{formatNumber(Math.max(0, goalTotals.metaClients - goalTotals.impactedClients))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Cobertura por zona</h3>
              <p className="text-xs text-slate-400 mt-1">Análisis de riesgo presupuestal por zona.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-sky-400" />
          </div>
          <Chart options={coverageOptions} series={coverageSeries} type="bar" height={320} />
        </GlassCard>

        <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-5 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Eficiencia por ciudad</h3>
              <p className="text-xs text-slate-400 mt-1">Costo por factura y rendimiento operativo.</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <Chart options={efficiencyOptions} series={efficiencySeries} type="line" height={320} />
        </GlassCard>
      </div>


      <GlassCard hoverable={false} className="bg-slate-950/85 border border-slate-800/70 p-4 md:p-5 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm md:text-base font-bold text-white">Impacto Numérico · Marca / Familia / Producto</h3>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              Cobertura real de clientes únicos por nivel jerárquico sobre el universo de la sede seleccionada.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar marca, familia o producto..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-10 py-2 outline-none focus:border-sky-500/50 transition-colors"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Header columns - Hidden on mobile, visible on md+ */}
        <div className="hidden md:flex items-center gap-4 px-4 pb-2 border-b border-slate-800 text-[9px] uppercase tracking-widest text-slate-500 font-semibold">
          <span className="flex-1 text-left">Nombre</span>
          <span className="w-32 text-right">Ventas</span>
          <span className="w-16 text-right">Facturas</span>
          <span className="w-20 text-right">Clientes</span>
          <span className="w-32 text-right">Cobertura</span>
          <span className="w-24 text-right">KG</span>
        </div>

        <div className="space-y-1 mt-2">
          {filteredHierarchy.length === 0 && (
            <p className="text-center text-slate-600 py-8 text-xs">No se encontraron resultados para la búsqueda.</p>
          )}
          {filteredHierarchy.map((brand, bi) => {
            const brandColor = BRAND_COLORS[bi % BRAND_COLORS.length];
            return (
              <div key={brand.label}>
               {/* ── MARCA ROW ── */}
              <button
                onClick={() => toggleBrand(brand.label)}
                className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 transition-all group"
              >
                <span
                  className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shrink-0 transition-all duration-200 ring-2 ring-offset-1 ring-offset-slate-900"
                  style={{
                    backgroundColor: brandColor,
                    boxShadow: expandedBrands[brand.label] ? `0 0 8px ${brandColor}` : 'none',
                    ringColor: brandColor
                  }}
                />
                <span className="flex-1 text-left text-xs md:text-sm font-bold text-white tracking-wide truncate">{brand.label}</span>
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <span className="w-32 text-right text-slate-200 font-semibold">{formatCurrency(brand.ventas)}</span>
                  <span className="w-16 text-right text-slate-300">{formatNumber(brand.facturas)}</span>
                  <span className="w-20 text-right text-sky-300 font-bold">{formatNumber(brand.clientesCount)}</span>
                  <div className="w-32 flex items-center justify-end gap-2">
                    <span className="text-sky-400 font-bold">{formatPercent(brand.coverage)}</span>
                    <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, brand.coverage * 100)}%`, background: brand.coverage >= 0.7 ? '#10b981' : brand.coverage >= 0.4 ? '#38bdf8' : '#f59e0b' }} />
                    </div>
                  </div>
                  <span className="w-24 text-right text-slate-200 font-semibold">{formatKg(brand.pesoTotalKg)}</span>
                </div>
                {/* Mobile summary */}
                <div className="flex md:hidden items-center gap-2 text-[10px]">
                  <span className="text-sky-400 font-bold">{formatPercent(brand.coverage)}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{formatShortCurrency(brand.ventas)}</span>
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
                          className="w-full flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-700/30 transition-all"
                        >
                          <span
                            className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 transition-all duration-200"
                            style={{
                              backgroundColor: famColor,
                              boxShadow: expandedFamilies[fKey] ? `0 0 6px ${famColor}` : 'none'
                            }}
                          />
                          <span className="flex-1 text-left text-[11px] md:text-xs font-semibold text-slate-100 truncate">{fam.label}</span>
                          <div className="hidden md:flex items-center gap-4 text-xs">
                            <span className="w-32 text-right text-slate-200">{formatCurrency(fam.ventas)}</span>
                            <span className="w-16 text-right text-slate-300">{formatNumber(fam.facturas)}</span>
                            <span className="w-20 text-right text-violet-300 font-semibold">{formatNumber(fam.clientesCount)}</span>
                            <div className="w-32 flex items-center justify-end gap-2">
                              <span className="text-violet-400 font-semibold">{formatPercent(fam.coverage)}</span>
                              <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, fam.coverage * 100)}%` }} />
                              </div>
                            </div>
                            <span className="w-24 text-right text-slate-200 font-semibold">{formatKg(fam.pesoTotalKg)}</span>
                          </div>
                          {/* Mobile summary */}
                          <div className="flex md:hidden items-center gap-2 text-[10px]">
                            <span className="text-violet-400 font-semibold">{formatPercent(fam.coverage)}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-300">{formatShortCurrency(fam.ventas)}</span>
                          </div>
                        </button>

                        {/* ── PRODUCTOS ── */}
                        {expandedFamilies[fKey] && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {fam.products.map((p, i) => (
                              <div 
                                key={`${p.nbProducto}-${i}`} 
                                onClick={() => setSelectedProduct(p)}
                                className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-md hover:bg-slate-800/40 transition-colors border border-transparent hover:border-slate-700/30 cursor-pointer group"
                              >
                                <span className="text-[9px] md:text-[10px] font-mono text-slate-400 w-10 md:w-12 shrink-0">{p.nbProducto}</span>
                                <span className="flex-1 text-[11px] md:text-xs text-slate-100 font-medium truncate max-w-[150px] md:max-w-[220px] group-hover:text-sky-400 transition-colors">{p.nmProducto}</span>
                                <div className="hidden md:flex items-center gap-4 text-xs">
                                  <span className="w-32 text-right text-slate-200">{formatCurrency(p.ventas)}</span>
                                  <span className="w-16 text-right text-slate-300">{formatNumber(p.facturas)}</span>
                                  <span className="w-20 text-right text-white font-semibold">{formatNumber(p.clientesCount)}</span>
                                  <div className="w-32 flex items-center justify-end gap-2">
                                    <span className="text-teal-300 font-bold">{formatPercent(p.coverage)}</span>
                                    <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-teal-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, p.coverage * 100)}%` }} />
                                    </div>
                                  </div>
                                  <span className="w-24 text-right text-slate-200">{formatKg(p.pesoTotalKg)}</span>
                                </div>
                                {/* Mobile summary */}
                                <div className="flex md:hidden items-center gap-1.5 text-[10px] shrink-0">
                                  <span className="text-teal-300 font-bold">{formatPercent(p.coverage)}</span>
                                  <span className="text-slate-500">·</span>
                                  <span className="text-slate-300">{formatShortCurrency(p.ventas)}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl p-4 md:p-6 relative flex flex-col gap-4 md:gap-6 text-slate-300 my-auto"
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute right-2 top-2 md:right-4 md:top-4 text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer z-10"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Header */}
            <div className="pr-8">
              <span className="text-[9px] md:text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-bold uppercase tracking-wider">
                Ficha de Producto · Focos Numérica
              </span>
              <h2 className="text-lg md:text-xl font-bold text-white mt-3">{selectedProduct.nmProducto}</h2>
              <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 mt-1.5 text-[10px] md:text-xs text-slate-400">
                <span>Código: <strong className="font-mono text-slate-300">{selectedProduct.nbProducto}</strong></span>
                <span>·</span>
                <span>Marca: <strong className="text-slate-300">{selectedProduct.nmTpMarca}</strong></span>
                <span>·</span>
                <span>Familia: <strong className="text-slate-300">{selectedProduct.nmTpFamilia}</strong></span>
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
                <div key={idx} className="bg-slate-950/40 border border-slate-800/80 rounded-lg md:rounded-xl p-2.5 md:p-3.5 flex flex-col gap-0.5 md:gap-1">
                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-wider font-semibold line-clamp-2">{kpi.label}</span>
                  <span className={`text-base md:text-lg font-bold ${kpi.color} mt-0.5`}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg md:rounded-xl p-3 md:p-4">
              <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider mb-2 md:mb-3">Información Adicional</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-[11px] md:text-xs">
                <div>
                  <span className="text-slate-500">Precio Promedio Unitario</span>
                  <p className="text-white font-bold mt-1">{formatCurrency(productStats.avgPrice)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Peso Total</span>
                  <p className="text-white font-bold mt-1">{formatKg(selectedProduct.pesoTotalKg || 0)}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-slate-500">Ticket Promedio</span>
                  <p className="text-white font-bold mt-1">{formatCurrency(productStats.totalInvoices > 0 ? productStats.totalSales / productStats.totalInvoices : 0)}</p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Sede Donut */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg md:rounded-xl p-4 md:p-5 flex flex-col">
                <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider mb-3 md:mb-4">Ventas por Sede (Eje)</h4>
                <div className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[220px]">
                  {productStats.activeSedes.length > 0 ? (
                    <Chart options={productStats.donutOptions} series={productStats.donutSeries} type="donut" width="100%" height={200} />
                  ) : (
                    <p className="text-slate-600 text-xs">Sin ventas en el periodo filtrado</p>
                  )}
                </div>
              </div>

              {/* Zones Bar */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg md:rounded-xl p-4 md:p-5 flex flex-col">
                <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider mb-3 md:mb-4">Top 5 Zonas por Ventas</h4>
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
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg md:rounded-xl p-4 md:p-5">
                <h4 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider mb-3 md:mb-4">Top Vendedores</h4>
                <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
                  <table className="w-full min-w-[400px] text-[11px] md:text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px] md:text-[10px]">
                        <th className="pb-2 pr-3 md:pr-4 text-left font-semibold">Vendedor</th>
                        <th className="pb-2 pr-3 md:pr-4 text-right font-semibold">Ventas</th>
                        <th className="pb-2 text-right font-semibold">Participación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {productStats.sellerList.slice(0, 10).map((seller, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2 pr-3 md:pr-4 text-slate-200 truncate max-w-[150px]">{seller.seller}</td>
                          <td className="py-2 pr-3 md:pr-4 text-right text-white font-semibold whitespace-nowrap">{formatShortCurrency(seller.sales)}</td>
                          <td className="py-2 text-right text-sky-400 font-bold">{formatPercent(seller.sales / productStats.totalSales)}</td>
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
