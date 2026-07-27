import { create } from 'zustand';
import { alpinaData } from '../data/alpina-data';
import { supabase } from '../services/supabaseClient';
import { DEFAULT_ZONE_SELLERS, ZONE_DEFAULT_CAMBIO_RATES } from '../utils/calculations';

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

const saveToStorage = (period) => {
  try {
    if (period) localStorage.setItem(PERIOD_KEY, period);
  } catch (e) { /* ignore quota errors */ }
};

const persistedData   = loadPersistedData();

// Usar datos persistidos SOLO como render inicial rápido (pantalla de carga).
// Supabase siempre sobreescribirá con datos frescos al iniciar.
// Esto garantiza que todos los dispositivos vean los mismos datos.
const _persistedHasData = persistedData &&
  ((persistedData.providers || []).length > 0 ||
   (persistedData.salesDaily || []).length > 0 ||
   (persistedData.zones || []).length > 0);
const initialData = null; // Siempre cargar desde Supabase — no usar caché de localStorage

// Limpiar cualquier dato viejo cacheado en localStorage para garantizar
// que todos los dispositivos carguen siempre datos frescos de Supabase.
try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
// El período activo: usar lo que esté guardado en localStorage.
// Migrar formato viejo 'nombre-YYYY' → 'YYYY-MM' si es necesario.
const _MONTH_NAME_TO_NUM = {
  'enero':10, 'febrero':2, 'marzo':3, 'abril':4, 'mayo':5, 'junio':6,
  'julio':7, 'agosto':8, 'septiembre':9, 'octubre':10, 'noviembre':11, 'diciembre':12,
  // fix: enero debe ser 1
};
_MONTH_NAME_TO_NUM['enero'] = 1;
const _migratePeriod = (p) => {
  if (!p) return null;
  // Ya está en formato YYYY-MM
  if (/^\d{4}-\d{2}$/.test(p)) return p;
  // Formato viejo: 'junio-2026' o 'Junio-2026'
  const m = p.toLowerCase().match(/^([a-záéíóúñ]+)-(\d{4})$/);
  if (m) {
    const num = _MONTH_NAME_TO_NUM[m[1]];
    if (num) return `${m[2]}-${String(num).padStart(2, '0')}`;
  }
  return p;
};
const _now = new Date();
const _currentCalendarPeriod = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`;
const _stored = localStorage.getItem(PERIOD_KEY);
const _migratedStored = _migratePeriod(_stored);
// Si el formato migró, actualizar localStorage
if (_stored && _migratedStored !== _stored) {
  try { localStorage.setItem(PERIOD_KEY, _migratedStored); } catch(e) {}
}
const persistedPeriod = _migratedStored || _currentCalendarPeriod;
// El período activo siempre es el mes actual del calendario.
// Lo guardado en localStorage solo sirve para la migración de formato,
// no para fijar el período por defecto.
const activePeriod = _currentCalendarPeriod;
const persistedChat   = loadPersistedChat();
const persistedWorkDay = parseInt(localStorage.getItem(WORKDAY_KEY) || '0', 10) || 0;

const hasSupabase = true; // supabase siempre configurado

const useStore = create((set, get) => ({
  // Filtros globales
  selectedPeriod: activePeriod,
  selectedCity: 'Todas',
  selectedZone: 'Todas',
  selectedProvider: 'Todas',
  selectedSeller: 'Todas',
  // En móvil inicia cerrado, en desktop abierto
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  darkMode: true,

  // Datos de negocio — se usan datos persistidos si existen y tienen contenido, si no el archivo estático
  dbData: initialData || alpinaData,
  isLoadingData: false,
  dataError: null,

  // Día hábil actual del periodo (0 = auto-detectar desde datos)
  currentWorkDay: persistedWorkDay,

  // Historial del chat del Asistente IA (persiste entre tabs y recargas)
  chatMessages: persistedChat || [],

  // Acciones
  setPeriod: (period) => {
    set({ selectedPeriod: period });
    // Al cambiar período, recargar datos del período seleccionado desde Supabase
    setTimeout(() => get().fetchDataFromSupabase(), 0);
  },
  setCity: (city) => set({ selectedCity: city }),
  setZone: (zone) => set({ selectedZone: zone }),
  setProvider: (provider) => set({ selectedProvider: provider }),
  setSeller: (seller) => set({ selectedSeller: seller }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setDbData: (newData, period) => {
    if (period) saveToStorage(period);
    set({ dbData: newData, ...(period ? { selectedPeriod: period } : {}) });
    // Regenerar notificaciones con los nuevos datos
    setTimeout(() => get().generateNotifications(), 0);
  },
  setCurrentWorkDay: async (day) => {
    const d = Math.max(0, Math.min(31, parseInt(day, 10) || 0));
    try { localStorage.setItem(WORKDAY_KEY, String(d)); } catch(e) {}
    set({ currentWorkDay: d });

    const currentPeriod = get().selectedPeriod;
    if (supabase && currentPeriod) {
      try {
        await supabase.from('providers').delete().eq('proveedor', '_CONFIG_WORKDAY_').eq('periodo', currentPeriod);
        if (d > 0) {
          await supabase.from('providers').insert([{
            proveedor: '_CONFIG_WORKDAY_',
            ventas2026: 0,
            ventas2025: 0,
            margen2026: 0,
            meta: d,
            periodo: currentPeriod
          }]);
        }
      } catch (e) {
        console.warn('Error al guardar Día Hábil en Supabase:', e);
      }
    }
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
      // Determinar el período a cargar (el seleccionado actualmente)
      const currentPeriod = get().selectedPeriod;

      // Fetch core tables in parallel, filtrando por período si la columna existe
      const [provRes, zonesRes, sellersRes, salesRes, returnsDailyRes,
             returnsConceptsRes, clientReturnsRes, expiryConceptsRes,
             expiryClientReturnsRes, productDistribRes, cityClientsRes] = await Promise.all([
        supabase.from('providers').select('*').eq('periodo', currentPeriod),
        supabase.from('zones').select('*').eq('periodo', currentPeriod),
        supabase.from('returns_sellers').select('*').eq('periodo', currentPeriod),
        supabase.from('sales_daily').select('*').eq('periodo', currentPeriod),
        supabase.from('returns_daily').select('*').eq('periodo', currentPeriod).then(r => r.error?.code === '42P01' ? { data: [], error: null } : r),
        supabase.from('returns_concepts').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
        supabase.from('client_returns').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
        supabase.from('expiry_concepts').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
        supabase.from('expiry_client_returns').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
        supabase.from('product_distrib').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
        supabase.from('city_clients').select('*').eq('periodo', currentPeriod).then(r => r.error ? { data: [], error: null } : r),
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
      const dbReturnsConcepts = returnsConceptsRes.data || [];
      const dbClientReturns = clientReturnsRes.data || [];
      const dbExpiryConcepts = expiryConceptsRes.data || [];
      const dbExpiryClientReturns = expiryClientReturnsRes.data || [];
      const dbProductDistrib = productDistribRes.data || [];
      const dbCityClients = cityClientsRes.data || [];

      // Extraer y aplicar configuración global del Día Hábil guardada en Supabase
      const configWorkDayRow = dbProviders.find(p => p.proveedor === '_CONFIG_WORKDAY_');
      let activeWorkDay = get().currentWorkDay;
      if (configWorkDayRow && Number(configWorkDayRow.meta) > 0) {
        const remoteWD = Number(configWorkDayRow.meta);
        if (remoteWD !== activeWorkDay) {
          activeWorkDay = remoteWD;
          try { localStorage.setItem(WORKDAY_KEY, String(remoteWD)); } catch(e) {}
          set({ currentWorkDay: remoteWD });
        }
      }

      if (dbProviders.length === 0 && dbZones.length === 0) {
        // Período sin datos aún (ej: julio recién empezó) — mostrar estado vacío sin pisar localStorage
        console.log(`Período ${currentPeriod} sin datos en Supabase. Mostrando estado vacío para este período.`);
        const emptyData = {
          providers: [],
          salesDaily: [],
          zones: [],
          returnsSellers: [],
          returnsConcepts: [],
          clientReturns: [],
          returnsDaily: [],
          expiryConcepts: [],
          expiryDaily: [],
          expiryClientReturns: [],
          productDistrib: []
        };
        // NO guardar en localStorage — no pisar datos de otros períodos que sí tienen datos
        set({ dbData: emptyData, isLoadingData: false });
        setTimeout(() => get().generateNotifications(), 0);
        return;
      }

      // Map back to alpinaData schema
      // Aplicar projectionFactor basado en el día hábil configurado manualmente (o auto-detectado)
      // Días hábiles por período (julio 2026 = 23, junio 2026 = 22, resto default 22)
      const DIAS_HABILES_POR_PERIODO = { '2026-06': 22, '2026-07': 23 };
      const TOTAL_BD = DIAS_HABILES_POR_PERIODO[currentPeriod] || 22;
      const configuredWD = activeWorkDay;
      const elapsedDays = (configuredWD > 0 && configuredWD <= TOTAL_BD) ? configuredWD : 18;
      const projFactor = (elapsedDays >= 3 && elapsedDays < TOTAL_BD) ? TOTAL_BD / elapsedDays : 1;

      const providers = dbProviders
        .filter(p => p.proveedor !== '_CONFIG_WORKDAY_')
        .map(p => ({
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
          cambiosPorc: ZONE_DEFAULT_CAMBIO_RATES[z.zona] || 0.015,
          facturas: Number(z.facturas) || 0
        };
      });

      const returnsSellers = dbSellers.map(s => {
        const bruto = Number(s.ventas) || 0;
        const dev   = Number(s.devoluciones) || 0;
        // rechazos: use explicit field if present, otherwise estimate as total devoluciones
        // (fallback for rows uploaded before this field was added)
        const rechazos = s.rechazos != null ? Number(s.rechazos) : dev;
        const ventasBrutas = s.ventasBrutas != null ? Number(s.ventasBrutas) : bruto;
        const SUPER_ZONES_SET = new Set(['M9450','M9451','M9550','M9560','M9600','P7000','P7001','P7002','P7008','P7009','P7010']);
        const canal = s.canal || (SUPER_ZONES_SET.has(s.ejecutivo) ? 'SUPER' : 'TAT');
        return {
          ejecutivo: s.ejecutivo,
          nombre: s.nombre && s.nombre !== 'Sin Asignar' ? s.nombre : (DEFAULT_ZONE_SELLERS[s.ejecutivo] || 'Sin Asignar'),
          canal,
          ventas: bruto,
          ventasBrutas,
          devoluciones: dev,
          rechazos,
          porcentajeDevolucion: bruto > 0 ? dev / bruto : 0.0,
          porcentajeRechazo: bruto > 0 ? rechazos / bruto : 0.0
        };
      });

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

      // Determine the most recent period from salesDaily — formato YYYY-MM (ej: '2026-07')
      const latestDate = dbSales.reduce((max, row) => {
        const date = new Date(row.fecha && !row.fecha.includes('T') ? row.fecha + 'T00:00:00' : row.fecha);
        return date > max ? date : max;
      }, new Date(0));
      
      // Format latestPeriod as "YYYY-MM" — mismo formato usado en la DB (default '2026-06')
      const lyear = latestDate.getFullYear();
      const lmonth = String(latestDate.getMonth() + 1).padStart(2, '0');
      const latestPeriod = `${lyear}-${lmonth}`;

      // Datos complementarios: Supabase es la fuente primaria, localStorage como caché local
      const localData = loadPersistedData();

      // Returns Concepts: Supabase → localStorage → alpinaData
      const returnsConcepts = dbReturnsConcepts.length > 0
        ? dbReturnsConcepts.map(c => ({ concepto: c.concepto, porcentaje: Number(c.porcentaje) || 0 }))
        : (localData?.returnsConcepts?.length > 0 ? localData.returnsConcepts : (alpinaData.returnsConcepts || []));

      // Client Returns: Supabase → localStorage → alpinaData
      const clientReturns = dbClientReturns.length > 0
        ? dbClientReturns.map(c => ({ ejecutivo: c.ejecutivo, cliente: c.cliente, concepto: c.concepto, valor: Number(c.valor) || 0 }))
        : (localData?.clientReturns?.length > 0 ? localData.clientReturns : (alpinaData.clientReturns || []));

      // Expiry Concepts: Supabase → localStorage → vacío
      const expiryConcepts = dbExpiryConcepts.length > 0
        ? dbExpiryConcepts.map(c => ({ concepto: c.concepto, porcentaje: Number(c.porcentaje) || 0 }))
        : (localData?.expiryConcepts?.length > 0 ? localData.expiryConcepts : (alpinaData.expiryConcepts || []));

      // Expiry Client Returns: Supabase → localStorage → vacío
      const expiryClientReturns = dbExpiryClientReturns.length > 0
        ? dbExpiryClientReturns.map(c => ({ ejecutivo: c.ejecutivo, cliente: c.cliente, concepto: c.concepto, valor: Number(c.valor) || 0 }))
        : (localData?.expiryClientReturns?.length > 0 ? localData.expiryClientReturns : (alpinaData.expiryClientReturns || []));

      // Expiry Daily: solo desde localStorage (no tiene tabla propia, returns_daily ya suma todo)
      const expiryDaily = localData?.expiryDaily?.length > 0 ? localData.expiryDaily : [];

      // Product Distrib: Supabase → localStorage → alpinaData
      const productDistrib = dbProductDistrib.length > 0
        ? dbProductDistrib.map(p => ({
            nbProducto: p.nb_producto, nmProducto: p.nm_producto, tpProducto: p.tp_producto,
            nmTpMarca: p.nm_tp_marca, nmTpFamilia: p.nm_tp_familia,
            zona: p.zona, vendedor: p.vendedor,
            ventas: Number(p.ventas) || 0, facturas: Number(p.facturas) || 0,
            unidades: Number(p.unidades) || 0, clientesCount: Number(p.clientes_count) || 0,
            participacion: Number(p.participacion) || 0, pesoTotal: Number(p.peso_total) || 0
          }))
        : (localData?.productDistrib?.length > 0 ? localData.productDistrib : (alpinaData.productDistrib || []));

      // returnsDaily: Supabase es la fuente de verdad (ya incluye rechazos + cambios desde el upload).
      // Solo usar localStorage como fallback si Supabase no tiene datos.
      let returnsDaily;
      if (dbReturnsDaily && dbReturnsDaily.length > 0) {
        // Datos de Supabase: rechazos + cambios ya sumados en el upload
        returnsDaily = dbReturnsDaily.map(rd => ({ fecha: rd.fecha, devoluciones: Number(rd.devoluciones) || 0 }));
      } else if (localData && localData.returnsDaily && localData.returnsDaily.length > 0) {
        // Fallback: localStorage si Supabase no tiene nada
        returnsDaily = localData.returnsDaily;
      } else {
        // Fallback final: distribuir devoluciones de sellers entre los días de venta
        const totalDevSellers = dbSellers.reduce((sum, s) => sum + (Number(s.devoluciones) || 0), 0);
        const uniqueSalesDates = Array.from(new Set(salesDaily.map(sd => sd.fecha)));
        const perDay = uniqueSalesDates.length > 0 ? Math.round(totalDevSellers / uniqueSalesDates.length) : 0;
        returnsDaily = uniqueSalesDates.map(fecha => ({ fecha, devoluciones: perDay }));
      }

      // City Clients: Supabase → localStorage → defaults
      const cityClients = dbCityClients.length > 0
        ? Object.fromEntries(dbCityClients.map(c => [c.ciudad, c.clientes]))
        : (localData?.cityClients || { 'ARMENIA': 1120, 'MANIZALES': 1390, 'PEREIRA': 2540 });

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
        productDistrib,
        cityClients
      };
      // Usar el período que se estaba consultando (no recalcular desde fechas para evitar desincronías)
      const resolvedPeriod = (dbSales.length > 0 && latestDate.getFullYear() > 2000) ? latestPeriod : currentPeriod;
      saveToStorage(newDbData, resolvedPeriod);
      set({
        dbData: newDbData,
        selectedPeriod: resolvedPeriod,
        isLoadingData: false
      });
      // Regenerar notificaciones con los datos frescos de Supabase
      setTimeout(() => get().generateNotifications(), 0);
      console.log('Datos de Supabase sincronizados.');
      console.log('  Ventas brutas:', salesDaily.reduce((s, d) => s + d.total, 0).toLocaleString('es-CO'));
      console.log('  Ventas netas (zones):', zones.reduce((s, z) => s + z.ventasNetas, 0).toLocaleString('es-CO'));
      console.log('  Dev. Total (returns_daily):', returnsDaily.reduce((s, d) => s + d.devoluciones, 0).toLocaleString('es-CO'));
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
