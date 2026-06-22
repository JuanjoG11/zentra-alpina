import { create } from 'zustand';
import { alpinaData } from '../data/alpina-data';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_ZONE_SELLERS } from '../utils/calculations';

const STORAGE_KEY = 'zentra_alpina_dbData';
const PERIOD_KEY  = 'zentra_alpina_period';

// Load persisted cube data from localStorage (survives page refresh)
const loadPersistedData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore parse errors */ }
  return null;
};

const saveToStorage = (dbData, period) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
    if (period) localStorage.setItem(PERIOD_KEY, period);
  } catch (e) { /* ignore quota errors */ }
};

const persistedData   = loadPersistedData();
const persistedPeriod = localStorage.getItem(PERIOD_KEY) || 'junio-2026';

const hasSupabase = true; // supabase siempre configurado

const useStore = create((set, get) => ({
  // Filtros globales
  selectedPeriod: persistedPeriod,
  selectedCity: 'Todas',
  selectedZone: 'Todas',
  selectedProvider: 'Todas',
  selectedSeller: 'Todas',
  // En móvil inicia cerrado, en desktop abierto
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  darkMode: true,

  // Datos de negocio — se usan datos persistidos si existen, si no el archivo estático
  dbData: persistedData || alpinaData,
  isLoadingData: false,
  dataError: null,

  // Acciones
  setPeriod: (period) => set({ selectedPeriod: period }),
  setCity: (city) => set({ selectedCity: city }),
  setZone: (zone) => set({ selectedZone: zone }),
  setProvider: (provider) => set({ selectedProvider: provider }),
  setSeller: (seller) => set({ selectedSeller: seller }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setDbData: (newData, period) => {
    saveToStorage(newData, period);
    set({ dbData: newData, ...(period ? { selectedPeriod: period } : {}) });
  },

  // Carga de datos desde Supabase
  fetchDataFromSupabase: async () => {
    if (!supabase) {
      console.log('Supabase no disponible. Usando datos locales.');
      return;
    }

    set({ isLoadingData: true, dataError: null });
    try {
      // Fetch core tables in parallel
      const [provRes, zonesRes, sellersRes, salesRes, returnsDailyRes] = await Promise.all([
        supabase.from('providers').select('*'),
        supabase.from('zones').select('*'),
        supabase.from('returns_sellers').select('*'),
        supabase.from('sales_daily').select('*'),
        supabase.from('returns_daily').select('*').then(r => r.error?.code === '42P01' ? { data: [], error: null } : r)
      ]);

      if (provRes.error) throw provRes.error;
      if (zonesRes.error) throw zonesRes.error;
      if (sellersRes.error) throw sellersRes.error;
      if (salesRes.error) throw salesRes.error;

      const dbProviders = provRes.data || [];
      const dbZones = zonesRes.data || [];
      const dbSellers = sellersRes.data || [];
      const dbSales = salesRes.data || [];
      const dbReturnsDaily = returnsDailyRes.data || [];

      if (dbProviders.length === 0 && dbZones.length === 0) {
        console.log('Las tablas de Supabase están vacías. Manteniendo datos de fallback locales.');
        set({ isLoadingData: false });
        return;
      }

      // Map back to alpinaData schema
      const providers = dbProviders.map(p => ({
        proveedor: p.proveedor,
        ventas2026: Number(p.ventas2026) || 0,
        ventas2025: Number(p.ventas2025) || 0,
        proyectado2025: Number(p.ventas2025) || 0,
        margen2025: 15,
        proyectado2026: Number(p.meta) || Number(p.ventas2026) || 0,
        margen2026: Number(p.margen2026) || 15,
        crecimiento: p.ventas2025 > 0 ? (p.ventas2026 - p.ventas2025) / p.ventas2025 : 0.2179
      }));

      const zones = dbZones.map(z => ({
        zona: z.zona,
        vendedor: z.vendedor && z.vendedor !== 'Sin Asignar' ? z.vendedor : (DEFAULT_ZONE_SELLERS[z.zona] || 'Sin Asignar'),
        presupuesto: Number(z.presupuesto) || 0,
        ventasNetas: Number(z.ventasnetas) || Number(z.ventasNetas) || 0,
        proyectado: Number(z.ventasnetas) || Number(z.ventasNetas) || 0,
        porcentajeProyectado: z.presupuesto > 0 ? (Number(z.ventasnetas) || Number(z.ventasNetas) || 0) / Number(z.presupuesto) : 1.0,
        cambiosPorc: 0.015,
        facturas: Number(z.facturas) || 0
      }));

      const returnsSellers = dbSellers.map(s => ({
        ejecutivo: s.ejecutivo,
        nombre: s.nombre && s.nombre !== 'Sin Asignar' ? s.nombre : (DEFAULT_ZONE_SELLERS[s.ejecutivo] || 'Sin Asignar'),
        ventas: Number(s.ventas) || 0,
        devoluciones: Number(s.devoluciones) || 0,
        porcentajeDevolucion: s.ventas > 0 ? Number(s.devoluciones) / Number(s.ventas) : 0.0
      }));

      // Aggregate salesDaily from dbSales — only sum POSITIVE ventas (gross sales).
      // Rows with negative ventas are returns that leaked from old ETL runs; we ignore them here
      // because returns are already tracked correctly in returns_daily / returns_sellers.
      const dailySalesMap = {};
      dbSales.forEach(s => {
        const rawDate = s.fecha;
        if (!rawDate) return;
        const ventas = Number(s.ventas) || 0;
        // Skip negative rows (returns that shouldn't be in sales_daily)
        if (ventas <= 0) return;

        // Format to M/D/YYYY
        const dObj = new Date(rawDate + 'T00:00:00');
        const formattedDate = `${dObj.getMonth() + 1}/${dObj.getDate()}/${dObj.getFullYear()}`;

        if (!dailySalesMap[formattedDate]) {
          dailySalesMap[formattedDate] = 0;
        }
        dailySalesMap[formattedDate] += ventas;
      });

      const salesDaily = Object.entries(dailySalesMap).map(([fecha, total]) => {
        // Estimate cash/credit ratio (e.g. 89% Contado, 11% Crédito as observed in real data)
        const contado = Math.round(total * 0.89);
        const credito = Math.round(total * 0.11);
        return {
          fecha,
          contado,
          credito,
          total
        };
      }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      // Use returns_daily from DB if available (populated by ETL upload).
      // Fall back to returns_sellers sum if returns_daily is empty (old DB state).
      const returnsConcepts = alpinaData.returnsConcepts;
      const clientReturns = alpinaData.clientReturns;

      // returnsDaily: prefer DB table, else build from sellers aggregates
      let returnsDaily;
      if (dbReturnsDaily && dbReturnsDaily.length > 0) {
        returnsDaily = dbReturnsDaily.map(rd => ({ fecha: rd.fecha, devoluciones: Number(rd.devoluciones) || 0 }));
      } else {
        // Fallback: spread seller total returns evenly across the observed sales days
        const totalDevSellers = dbSellers.reduce((sum, s) => sum + (Number(s.devoluciones) || 0), 0);
        const salesDays = Object.keys(dailySalesMap);
        const perDay = salesDays.length > 0 ? Math.round(totalDevSellers / salesDays.length) : 0;
        returnsDaily = salesDays.map(fecha => ({ fecha, devoluciones: perDay }));
      }

    // Determine the most recent period from salesDaily and update selectedPeriod
    const latestDate = dbSales.reduce((max, row) => {
      const date = new Date(row.fecha);
      return date > max ? date : max;
    }, new Date(0));
    const latestPeriod = latestDate.toISOString().substring(0, 7); // YYYY-MM
    // Update store with fetched data and latest period
    const newDbData = {
      providers,
      salesDaily,
      zones,
      returnsSellers,
      returnsConcepts,
      clientReturns,
      returnsDaily
    };
    saveToStorage(newDbData, latestPeriod);
    set({
      dbData: newDbData,
      selectedPeriod: latestPeriod,
      isLoadingData: false
    });
    console.log('Datos de Supabase sincronizados. Ventas brutas:', salesDaily.reduce((s, d) => s + d.total, 0));
    console.log('Devoluciones totales:', returnsDaily.reduce((s, d) => s + d.devoluciones, 0));
    } catch (err) {
      console.error('Error al sincronizar datos con Supabase:', err);
      set({ dataError: err.message, isLoadingData: false });
    }
  },

  // Notificaciones
  notifications: [
    {
      id: 1,
      type: 'warning',
      title: 'Devoluciones altas',
      message: 'Sandra M. García tiene 11.4% de devoluciones',
      time: 'Hace 2h',
      read: false,
    },
    {
      id: 2,
      type: 'success',
      title: 'Meta superada',
      message: 'Zona M9458 alcanzó 111.8% de cumplimiento',
      time: 'Hace 3h',
      read: false,
    },
    {
      id: 3,
      type: 'info',
      title: 'Crecimiento Alpina',
      message: 'Alpina creció 21.79% vs año anterior',
      time: 'Hace 5h',
      read: true,
    },
    {
      id: 4,
      type: 'danger',
      title: 'Alquería ganando terreno',
      message: 'Alquería incrementó 14% en leches UHT en Pereira',
      time: 'Hace 6h',
      read: false,
    },
  ],
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  // Indicadores configurables (perfil de indicadores)
  indicators: [
    { id: 1, name: 'Ventas Totales', formula: 'totalSales' },
    { id: 2, name: 'Ventas Netas', formula: 'netSales' },
    { id: 3, name: 'Cumplimiento %', formula: 'compliance * 100' }
  ],
  addIndicator: (indicator) =>
    set((state) => ({ indicators: [...state.indicators, { id: Date.now(), ...indicator }] })),
  updateIndicator: (id, patch) =>
    set((state) => ({ indicators: state.indicators.map(i => i.id === id ? { ...i, ...patch } : i) })),
  removeIndicator: (id) =>
    set((state) => ({ indicators: state.indicators.filter(i => i.id !== id) })),
}));

export default useStore;
