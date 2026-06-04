import { create } from 'zustand';
import { alpinaData } from '../data/alpina-data';
import { supabase } from '../services/supabaseClient';

const hasSupabase = !!supabase; // supabase is null if not configured

const useStore = create((set, get) => ({
  // Filtros globales
  selectedPeriod: 'abril-2026',
  selectedCity: 'PEREIRA',
  selectedZone: 'Todas',
  selectedProvider: 'Todas',
  selectedSeller: 'Todas',
  sidebarOpen: true,
  darkMode: true,

  // Datos de negocio (inicializados con el archivo estático)
  dbData: alpinaData,
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
  setDbData: (newData) => set({ dbData: newData }),

  // Carga de datos desde Supabase
  fetchDataFromSupabase: async () => {
    if (!supabase) {
      console.log('Supabase no está configurado en las variables de entorno. Usando datos locales.');
      return;
    }

    set({ isLoadingData: true, dataError: null });
    try {
      // Fetch core tables in parallel
      const [provRes, zonesRes, sellersRes, salesRes] = await Promise.all([
        supabase.from('providers').select('*'),
        supabase.from('zones').select('*'),
        supabase.from('returns_sellers').select('*'),
        supabase.from('sales_daily').select('*')
      ]);

      if (provRes.error) throw provRes.error;
      if (zonesRes.error) throw zonesRes.error;
      if (sellersRes.error) throw sellersRes.error;
      if (salesRes.error) throw salesRes.error;

      const dbProviders = provRes.data || [];
      const dbZones = zonesRes.data || [];
      const dbSellers = sellersRes.data || [];
      const dbSales = salesRes.data || [];

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
        vendedor: z.vendedor || 'Sin Asignar',
        presupuesto: Number(z.presupuesto) || 0,
        ventasNetas: Number(z.ventasNetas) || 0,
        proyectado: Number(z.ventasNetas) || 0,
        porcentajeProyectado: z.presupuesto > 0 ? Number(z.ventasNetas) / Number(z.presupuesto) : 1.0,
        cambiosPorc: 0.015,
        facturas: Number(z.facturas) || 0
      }));

      const returnsSellers = dbSellers.map(s => ({
        ejecutivo: s.ejecutivo,
        nombre: s.nombre,
        ventas: Number(s.ventas) || 0,
        devoluciones: Number(s.devoluciones) || 0,
        porcentajeDevolucion: s.ventas > 0 ? Number(s.devoluciones) / Number(s.ventas) : 0.0
      }));

      // Aggregate salesDaily from dbSales
      const dailySalesMap = {};
      dbSales.forEach(s => {
        const rawDate = s.fecha;
        if (!rawDate) return;
        
        // Format to M/D/YYYY
        const dObj = new Date(rawDate + 'T00:00:00');
        const formattedDate = `${dObj.getMonth() + 1}/${dObj.getDate()}/${dObj.getFullYear()}`;

        if (!dailySalesMap[formattedDate]) {
          dailySalesMap[formattedDate] = 0;
        }
        dailySalesMap[formattedDate] += Number(s.ventas) || 0;
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

      // Build returnsDaily and returnsConcepts dynamically from database returns
      const totalDev = returnsSellers.reduce((sum, s) => sum + s.devoluciones, 0);
      
      // Fallback: merge with original clientReturns, returnsConcepts if not in DB to prevent blanks
      const returnsConcepts = alpinaData.returnsConcepts;
      const returnsDaily = alpinaData.returnsDaily;
      const clientReturns = alpinaData.clientReturns;

      set({
        dbData: {
          providers,
          salesDaily,
          zones,
          returnsSellers,
          returnsConcepts,
          returnsDaily,
          clientReturns
        },
        isLoadingData: false
      });
      console.log('Datos de Supabase sincronizados en la UI con éxito.');
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
      title: 'Caída en ventas',
      message: 'Alimentos Polar cayó -63.41%',
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
