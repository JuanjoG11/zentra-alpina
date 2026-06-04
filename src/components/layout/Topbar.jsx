import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { 
  Bell, 
  Sun, 
  Moon, 
  Search,
  Filter,
  Check
} from 'lucide-react';

const Topbar = () => {
  const {
    selectedPeriod, setPeriod,
    selectedCity, setCity,
    selectedZone, setZone,
    selectedProvider, setProvider,
    selectedSeller, setSeller,
    darkMode, toggleDarkMode,
    notifications, markAsRead, unreadCount,
    dbData
  } = useStore();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Extract unique periods from salesDaily
  const getPeriodsList = () => {
    const list = new Set();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (dbData.salesDaily) {
      dbData.salesDaily
        .filter(d => d.fecha && d.fecha !== 'general')
        .forEach(d => {
          const dt = new Date(d.fecha);
          if (!isNaN(dt.getTime())) {
            const key = `${monthNames[dt.getMonth()].toLowerCase()}-${dt.getFullYear()}`;
            const label = `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
            list.add(JSON.stringify({ key, label }));
          }
        });
    }
    
    if (list.size === 0) {
      list.add(JSON.stringify({ key: 'abril-2026', label: 'Abril 2026' }));
    }
    
    return Array.from(list).map(item => JSON.parse(item));
  };

  // Extract unique filter values from real data
  const zonesList = ['Todas', ...new Set((dbData.zones || []).map(z => z.zona))].filter(Boolean);
  const providersList = ['Todas', ...new Set((dbData.providers || [])
    .filter(p => p.proveedor.toUpperCase().includes('ALPINA'))
    .map(p => p.proveedor))].filter(Boolean);
  const sellersList = [
    'Todas', 
    ...new Set((dbData.returnsSellers || []).map(s => s.nombre).filter(n => n && n !== 'CLIENTE' && n !== 'SERVICIO  CLIENTE'))
  ];

  return (
    <header className="fixed top-0 right-0 z-20 h-16 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between px-6 transition-all duration-300 ease-in-out"
      style={{ left: useStore(state => state.sidebarOpen) ? '16rem' : '5rem' }}
    >
      {/* Filters Area */}
      <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none max-w-[70%]">
        <div className="flex items-center gap-1 text-slate-500 text-xs mr-2 font-medium shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span>Filtros:</span>
        </div>

        {/* Periodo */}
        <div className="flex flex-col">
          <select
            value={selectedPeriod}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            {getPeriodsList().map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Ciudad */}
        <div className="flex flex-col">
          <select
            value={selectedCity}
            onChange={(e) => setCity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="PEREIRA">Pereira (Comercial)</option>
            <option value="MANIZALES">Manizales (Devoluciones)</option>
            <option value="Todas">Todas las sedes</option>
          </select>
        </div>

        {/* Proveedor */}
        <div className="flex flex-col">
          <select
            value={selectedProvider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Todas">Proveedores: Todos</option>
            {providersList.filter(p => p !== 'Todas').map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Zona */}
        <div className="flex flex-col">
          <select
            value={selectedZone}
            onChange={(e) => setZone(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Todas">Zonas: Todas</option>
            {zonesList.filter(z => z !== 'Todas').map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        {/* Vendedor */}
        <div className="flex flex-col">
          <select
            value={selectedSeller}
            onChange={(e) => setSeller(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="Todas">Vendedor: Todos</option>
            {sellersList.filter(s => s !== 'Todas').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="relative max-w-xs hidden xl:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar reporte, vendedor..."
            className="bg-slate-900/60 border border-slate-800/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-52 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="p-2 rounded-xl border border-slate-800/60 bg-slate-900/30 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 relative"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount() > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifDropdownOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-slate-850 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Alertas Operativas</span>
                {unreadCount() > 0 && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount()} nuevas
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-900">
                {notifications.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                    }}
                    className={`p-2.5 hover:bg-slate-900/60 transition-colors rounded-lg flex items-start gap-2.5 cursor-pointer ${
                      !n.read ? 'bg-slate-900/20' : ''
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      {n.type === 'warning' && <span className="h-2 w-2 rounded-full bg-amber-500 block" />}
                      {n.type === 'success' && <span className="h-2 w-2 rounded-full bg-emerald-500 block" />}
                      {n.type === 'info' && <span className="h-2 w-2 rounded-full bg-blue-500 block" />}
                      {n.type === 'danger' && <span className="h-2 w-2 rounded-full bg-rose-500 block" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-medium truncate ${!n.read ? 'text-slate-100' : 'text-slate-400'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <Check className="h-3.5 w-3.5 text-blue-400 mt-1 shrink-0 opacity-0 hover:opacity-100" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
