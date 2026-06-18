import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { ZONAS_POR_CIUDAD } from '../../utils/calculations';
import {
  Bell, Sun, Moon, Search, Filter, MapPin,
  Menu, ChevronDown, X
} from 'lucide-react';

const selectCls = "w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors";

const Topbar = () => {
  const {
    selectedPeriod, setPeriod,
    selectedCity,   setCity,
    selectedZone,   setZone,
    selectedSeller, setSeller,
    toggleSidebar,
    darkMode,       toggleDarkMode,
    notifications,  markAsRead, unreadCount,
    dbData
  } = useStore();

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Periodos ──────────────────────────────────────────────────────────
  const getPeriodsList = () => {
    const list = new Set();
    const m = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    (dbData.salesDaily || []).filter(d => d.fecha && d.fecha !== 'general').forEach(d => {
      const dt = new Date(d.fecha);
      if (!isNaN(dt.getTime())) {
        list.add(JSON.stringify({ key: `${m[dt.getMonth()].toLowerCase()}-${dt.getFullYear()}`, label: `${m[dt.getMonth()]} ${dt.getFullYear()}` }));
      }
    });
    if (list.size === 0) list.add(JSON.stringify({ key: 'abril-2026', label: 'Abril 2026' }));
    return Array.from(list).map(i => JSON.parse(i));
  };

  // ── Zonas y vendedores filtrados por ciudad ───────────────────────────
  const zonasDisponibles = React.useMemo(() => {
    const all = (dbData.zones || []).map(z => z.zona);
    if (!selectedCity || selectedCity === 'Todas') return all;
    const ok = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
    return all.filter(z => ok.has(z));
  }, [dbData.zones, selectedCity]);

  const vendedoresDisponibles = React.useMemo(() => {
    if (!selectedCity || selectedCity === 'Todas')
      return (dbData.returnsSellers || []).map(s => s.nombre).filter(n => n && n !== 'CLIENTE' && n !== 'SERVICIO  CLIENTE');
    const ok = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
    return (dbData.returnsSellers || []).filter(s => ok.has(s.ejecutivo)).map(s => s.nombre).filter(n => n && n !== 'CLIENTE' && n !== 'SERVICIO  CLIENTE');
  }, [dbData.returnsSellers, selectedCity]);

  const handleCityChange = (city) => {
    setCity(city);
    if (city !== 'Todas') {
      const ok = new Set(ZONAS_POR_CIUDAD[city] || []);
      if (selectedZone !== 'Todas' && !ok.has(selectedZone)) setZone('Todas');
      const sz = (dbData.returnsSellers || []).find(s => s.nombre === selectedSeller)?.ejecutivo;
      if (selectedSeller !== 'Todas' && sz && !ok.has(sz)) setSeller('Todas');
    }
  };

  const cities = [
    { value: 'Todas',     label: 'Todas las sedes'        },
    { value: 'PEREIRA',   label: 'Pereira — Eje Pereira'  },
    { value: 'MANIZALES', label: 'Manizales — Eje Caldas' },
    { value: 'ARMENIA',   label: 'Armenia — Eje Quindío'  },
  ];

  const sidebarOpen = useStore(s => s.sidebarOpen);

  // Cuántos filtros activos (para badge)
  const activeFilters = [selectedCity !== 'Todas', selectedZone !== 'Todas', selectedSeller !== 'Todas'].filter(Boolean).length;

  return (
    <>
      {/* ── TOPBAR FIJO ───────────────────────────────────────────────── */}
      <header className={`
        fixed top-0 right-0 z-20 h-16
        border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl
        flex items-center justify-between px-4 md:px-5
        transition-all duration-300 ease-in-out
        left-0
        ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}
      `}>

        {/* Izquierda: hamburguesa en móvil + filtros en desktop */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Hamburguesa — solo móvil */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Filtros en línea — solo desktop (md+) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 text-slate-500 text-xs font-medium shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros:</span>
            </div>

            {/* Periodo */}
            <select value={selectedPeriod} onChange={e => setPeriod(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors shrink-0">
              {getPeriodsList().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>

            {/* Ciudad */}
            <div className="relative shrink-0">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-blue-400 pointer-events-none" />
              <select value={selectedCity} onChange={e => handleCityChange(e.target.value)}
                className="bg-slate-900 border border-blue-500/30 rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-blue-300 font-semibold focus:outline-none focus:border-blue-500 transition-colors">
                {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Zona */}
            <select value={selectedZone} onChange={e => setZone(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors shrink-0">
              <option value="Todas">Zona: Todas</option>
              {zonasDisponibles.map(z => <option key={z} value={z}>{z}</option>)}
            </select>

            {/* Vendedor */}
            <select value={selectedSeller} onChange={e => setSeller(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors shrink-0">
              <option value="Todas">Vendedor: Todos</option>
              {vendedoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Botón filtros — solo móvil */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-300 font-medium shrink-0 transition-all hover:border-blue-500/40"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros</span>
            {activeFilters > 0 && (
              <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Búsqueda — solo xl */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input type="text" placeholder="Buscar vendedor..."
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-44 transition-all" />
          </div>

          {/* Modo oscuro */}
          <button onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notificaciones */}
          <div className="relative">
            <button onClick={() => { setNotifOpen(v => !v); setFiltersOpen(false); }}
              className="relative p-2 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all">
              <Bell className="h-4 w-4" />
              {unreadCount() > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Alertas Operativas</span>
                  {unreadCount() > 0 && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-medium">{unreadCount()} nuevas</span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-900">
                  {notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id)}
                      className={`p-2.5 hover:bg-slate-900/60 transition-colors rounded-lg flex items-start gap-2.5 cursor-pointer ${!n.read ? 'bg-slate-900/20' : ''}`}>
                      <div className="mt-1 shrink-0">
                        {n.type === 'warning' && <span className="h-2 w-2 rounded-full bg-amber-500 block" />}
                        {n.type === 'success' && <span className="h-2 w-2 rounded-full bg-emerald-500 block" />}
                        {n.type === 'info'    && <span className="h-2 w-2 rounded-full bg-blue-500 block" />}
                        {n.type === 'danger'  && <span className="h-2 w-2 rounded-full bg-rose-500 block" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium truncate ${!n.read ? 'text-slate-100' : 'text-slate-400'}`}>{n.title}</p>
                          <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── PANEL DE FILTROS MÓVIL (desplegable bajo el topbar) ──────── */}
      {filtersOpen && (
        <div className="fixed top-16 left-0 right-0 z-20 md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtros</span>
            <button onClick={() => setFiltersOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Periodo</p>
              <select value={selectedPeriod} onChange={e => setPeriod(e.target.value)} className={selectCls}>
                {getPeriodsList().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Ciudad / Eje</p>
              <select value={selectedCity} onChange={e => handleCityChange(e.target.value)} className={selectCls}>
                {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Zona</p>
              <select value={selectedZone} onChange={e => setZone(e.target.value)} className={selectCls}>
                <option value="Todas">Todas</option>
                {zonasDisponibles.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Vendedor</p>
              <select value={selectedSeller} onChange={e => setSeller(e.target.value)} className={selectCls}>
                <option value="Todas">Todos</option>
                {vendedoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setCity('Todas'); setZone('Todas'); setSeller('Todas'); }}
              className="w-full text-center text-xs text-rose-400 hover:text-rose-300 py-1 font-medium transition-colors"
            >
              Limpiar {activeFilters} filtro{activeFilters > 1 ? 's' : ''} activo{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default Topbar;
