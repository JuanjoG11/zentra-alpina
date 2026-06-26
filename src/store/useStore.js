import { create } from 'zustand';
import { alpinaData } from '../data/alpina-data';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_ZONE_SELLERS } from '../utils/calculations';

const STORAGE_KEY = 'zentra_alpina_dbData';
const PERIOD_KEY  = 'zentra_alpina_period';
const CHAT_KEY    = 'zentra_alpina_chat';
const WORKDAY_KEY = 'zentra_alpina_workday';

// Load persisted cube data from localStorage (survives page refresh)
const loadPersistedData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore parse errors */ }
  return null;
};

const loadPersistedChat = () => {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
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
const persistedChat   = loadPersistedChat();
const persistedWorkDay = parseInt(localStorage.getItem(WORKDAY_KEY) || '0', 10) || 0;

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

  // Día hábil actual del periodo (0 = auto-detectar desde datos)
  currentWorkDay: persistedWorkDay,

  // Historial del chat del Asistente IA (persiste entre tabs y recargas)
  chatMessages: persistedChat || [],

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
    // Regenerar notificaciones con los nuevos datos
    setTimeout(() => get().generateNotifications(), 0);
  },
  setCurrentWorkDay: (day) => {
    const d = Math.max(0, Math.min(31, parseInt(day, 10) || 0));
    try { localStorage.setItem(WORKDAY_KEY, String(d)); } catch(e) {}
    set({ currentWorkDay: d });
  },
  setChatMessages: (msgs) => {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); } catch(e) {}
    set({ chatMessages: msgs });
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
      // Aplicar projectionFactor basado en el día hábil configurado manualmente (o auto-detectado)
      const TOTAL_BD = 22;
      const configuredWD = get().currentWorkDay;
      const detectedDays = new Set(
        dbSales.filter(s => Number(s.ventas) > 0 && s.fecha)
          .map(s => s.fecha.substring(0, 10))
      ).size;
      const elapsedDays = (configuredWD > 0 && configuredWD <= TOTAL_BD) ? configuredWD : (detectedDays || 1);
      const projFactor = (elapsedDays >= 3 && elapsedDays < TOTAL_BD) ? TOTAL_BD / elapsedDays : 1;

      const providers = dbProviders.map(p => ({
        proveedor: p.proveedor,
        ventas2026: Number(p.ventas2026) || 0,
        ventas2025: Number(p.ventas2025) || 0,
        proyectado2025: Number(p.ventas2025) || 0,
        margen2025: 15,
        proyectado2026: Math.round((Number(p.meta) || Number(p.ventas2026) || 0) * projFactor),
        margen2026: Number(p.margen2026) || 15,
        crecimiento: p.ventas2025 > 0 ? (p.ventas2026 - p.ventas2025) / p.ventas2025 : 0.2179
      }));

      const zones = dbZones.map(z => {
        const net = Number(z.ventasnetas) || Number(z.ventasNetas) || 0;
        const projected = Math.round(net * projFactor);
        const budget = Number(z.presupuesto) || 0;
        return {
          zona: z.zona,
          vendedor: z.vendedor && z.vendedor !== 'Sin Asignar' ? z.vendedor : (DEFAULT_ZONE_SELLERS[z.zona] || 'Sin Asignar'),
          presupuesto: budget,
          ventasNetas: net,
          proyectado: projected,
          porcentajeProyectado: budget > 0 ? projected / budget : 1.0,
          cambiosPorc: 0.015,
          facturas: Number(z.facturas) || 0
        };
      });

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
        const zone = s.zona || 'OTRO';

        const key = `${formattedDate}_${zone}`;
        if (!dailySalesMap[key]) {
          dailySalesMap[key] = { fecha: formattedDate, zona: zone, total: 0 };
        }
        dailySalesMap[key].total += ventas;
      });

      const salesDaily = Object.values(dailySalesMap).map(d => {
        // Estimate cash/credit ratio (e.g. 89% Contado, 11% Crédito as observed in real data)
        const total = d.total;
        const contado = Math.round(total * 0.89);
        const credito = Math.round(total * 0.11);
        return {
          fecha: d.fecha,
          zona: d.zona,
          contado,
          credito,
          total
        };
      }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      // Determine the most recent period from salesDaily and update selectedPeriod
      const latestDate = dbSales.reduce((max, row) => {
        const date = new Date(row.fecha && !row.fecha.includes('T') ? row.fecha + 'T00:00:00' : row.fecha);
        return date > max ? date : max;
      }, new Date(0));
      
      const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      // Format latestPeriod as "monthname-YYYY" to be completely consistent with the rest of the application
      const latestPeriod = `${monthNames[latestDate.getMonth()]}-${latestDate.getFullYear()}`;

      // Try to preserve concepts, clientReturns, expiryConcepts, expiryDaily, expiryClientReturns
      // from local persisted data if the period matches.
      const currentPeriod = localStorage.getItem(PERIOD_KEY);
      const isSamePeriod = currentPeriod && currentPeriod.toLowerCase().trim() === latestPeriod.toLowerCase().trim();
      
      const localData = loadPersistedData();
      
      const returnsConcepts = (isSamePeriod && localData && localData.returnsConcepts && localData.returnsConcepts.length > 0) 
        ? localData.returnsConcepts 
        : alpinaData.returnsConcepts;
        
      const clientReturns = (isSamePeriod && localData && localData.clientReturns && localData.clientReturns.length > 0) 
        ? localData.clientReturns 
        : alpinaData.clientReturns;
        
      const expiryConcepts = (isSamePeriod && localData && localData.expiryConcepts && localData.expiryConcepts.length > 0) 
        ? localData.expiryConcepts 
        : (alpinaData.expiryConcepts || []);
        
      const expiryDaily = (isSamePeriod && localData && localData.expiryDaily && localData.expiryDaily.length > 0) 
        ? localData.expiryDaily 
        : (alpinaData.expiryDaily || []);
        
      const expiryClientReturns = (isSamePeriod && localData && localData.expiryClientReturns && localData.expiryClientReturns.length > 0) 
        ? localData.expiryClientReturns 
        : (alpinaData.expiryClientReturns || []);

      const productDistrib = (isSamePeriod && localData && localData.productDistrib && localData.productDistrib.length > 0)
        ? localData.productDistrib
        : (alpinaData.productDistrib || []);

      // returnsDaily: prefer localData with zone details if same period, else prefer DB table, else build from sellers aggregates
      let returnsDaily;
      if (isSamePeriod && localData && localData.returnsDaily && localData.returnsDaily.length > 0) {
        returnsDaily = localData.returnsDaily;
      } else if (dbReturnsDaily && dbReturnsDaily.length > 0) {
        returnsDaily = dbReturnsDaily.map(rd => ({ fecha: rd.fecha, devoluciones: Number(rd.devoluciones) || 0 }));
      } else {
        // Fallback: spread seller total returns evenly across the observed sales days
        const totalDevSellers = dbSellers.reduce((sum, s) => sum + (Number(s.devoluciones) || 0), 0);
        const uniqueSalesDates = Array.from(new Set(salesDaily.map(sd => sd.fecha)));
        const perDay = uniqueSalesDates.length > 0 ? Math.round(totalDevSellers / uniqueSalesDates.length) : 0;
        returnsDaily = uniqueSalesDates.map(fecha => ({ fecha, devoluciones: perDay }));
      }

      // Update store with fetched data and latest period
      const newDbData = {
        providers,
        salesDaily,
        zones,
        returnsSellers,
        returnsConcepts,
        clientReturns,
        returnsDaily,
        expiryConcepts,
        expiryDaily,
        expiryClientReturns,
        productDistrib
      };
      saveToStorage(newDbData, latestPeriod);
      set({
        dbData: newDbData,
        selectedPeriod: latestPeriod,
        isLoadingData: false
      });
      // Regenerar notificaciones con los datos frescos de Supabase
      setTimeout(() => get().generateNotifications(), 0);
      console.log('Datos de Supabase sincronizados. Ventas brutas:', salesDaily.reduce((s, d) => s + d.total, 0));
      console.log('Devoluciones totales:', returnsDaily.reduce((s, d) => s + d.devoluciones, 0));
    } catch (err) {
      console.error('Error al sincronizar datos con Supabase:', err);
      set({ dataError: err.message, isLoadingData: false });
    }
  },

  // Notificaciones — generadas dinámicamente desde los datos reales
  notifications: [],
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  // Genera notificaciones inteligentes desde los datos del canal
  generateNotifications: () => {
    const { dbData } = get();
    if (!dbData) return;

    const { zones = [], returnsSellers = [], providers = [], salesDaily = [] } = dbData;
    const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const notifs = [];

    // 1. Ejecutivos con devolución > 8% (crítico) o > 5% (alerta)
    const badSellers = returnsSellers
      .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE' && s.porcentajeDevolucion > 0.05)
      .sort((a, b) => b.porcentajeDevolucion - a.porcentajeDevolucion)
      .slice(0, 2);
    badSellers.forEach((s, i) => {
      const pct = (s.porcentajeDevolucion * 100).toFixed(1);
      notifs.push({
        id: `dev-${s.ejecutivo || i}`,
        type: s.porcentajeDevolucion > 0.08 ? 'danger' : 'warning',
        title: s.porcentajeDevolucion > 0.08 ? 'Devolución crítica' : 'Devolución alta',
        message: `${s.nombre} registra ${pct}% de devoluciones`,
        route: '/devoluciones',
        time: now,
        read: false
      });
    });

    // 2. Zonas que superaron la meta (celebrar)
    const topZones = zones
      .filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto >= 1.0)
      .sort((a, b) => (b.ventasNetas / b.presupuesto) - (a.ventasNetas / a.presupuesto))
      .slice(0, 2);
    topZones.forEach(z => {
      const pct = ((z.ventasNetas / z.presupuesto) * 100).toFixed(1);
      notifs.push({
        id: `meta-${z.zona}`,
        type: 'success',
        title: 'Meta superada',
        message: `Zona ${z.zona} (${z.vendedor}) alcanzó ${pct}% de cumplimiento`,
        route: '/vendedores',
        time: now,
        read: false
      });
    });

    // 3. Zonas por debajo del 60% (urgente)
    const criticalZones = zones
      .filter(z => z.presupuesto > 0 && z.ventasNetas / z.presupuesto < 0.6)
      .sort((a, b) => (a.ventasNetas / a.presupuesto) - (b.ventasNetas / b.presupuesto))
      .slice(0, 1);
    criticalZones.forEach(z => {
      const pct = ((z.ventasNetas / z.presupuesto) * 100).toFixed(1);
      notifs.push({
        id: `zona-baja-${z.zona}`,
        type: 'danger',
        title: 'Zona en alerta crítica',
        message: `Zona ${z.zona} solo lleva ${pct}% del presupuesto`,
        route: '/focos',
        time: now,
        read: false
      });
    });

    // 4. Crecimiento YoY del proveedor principal
    const mainProv = providers
      .filter(p => p.proveedor.toUpperCase().includes('ALPINA'))
      .sort((a, b) => b.ventas2026 - a.ventas2026)[0];
    if (mainProv && mainProv.crecimiento > 0) {
      const pct = (mainProv.crecimiento * 100).toFixed(2);
      notifs.push({
        id: 'crecimiento-alpina',
        type: 'info',
        title: 'Crecimiento Alpina',
        message: `${mainProv.proveedor} creció +${pct}% vs año anterior`,
        route: '/proveedores',
        time: now,
        read: true
      });
    }

    // 5. Tasa de devolución global alta (> 6%)
    const totalSales = salesDaily.reduce((s, d) => s + (d.total || 0), 0);
    const totalReturns = returnsSellers.reduce((s, r) => s + (r.devoluciones || 0), 0);
    const globalDevRate = totalSales > 0 ? totalReturns / totalSales : 0;
    if (globalDevRate > 0.06) {
      notifs.push({
        id: 'tasa-dev-global',
        type: 'warning',
        title: 'Tasa de devolución elevada',
        message: `El canal registra ${(globalDevRate * 100).toFixed(1)}% de devolución global`,
        route: '/devoluciones',
        time: now,
        read: false
      });
    }

    set({ notifications: notifs.slice(0, 6) }); // máximo 6 notificaciones activas
  },

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
