import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/useStore';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3, TrendingUp, RefreshCw, Truck, Users,
  Brain, Upload, ChevronLeft, ChevronRight, Sparkles, X, LogOut
} from 'lucide-react';

const menuSections = [
  {
    label: 'Analítica',
    role: 'gerente',
    items: [
      { name: 'Dashboard Ejecutivo',    path: '/',              icon: BarChart3   },
      { name: 'Análisis de Ventas',     path: '/ventas',        icon: TrendingUp  },
      { name: 'Devoluciones',           path: '/devoluciones',  icon: RefreshCw   },
      { name: 'Focos Numérica',         path: '/focos',         icon: Sparkles    },
    ]
  },
  {
    label: 'Comercial',
    role: 'gerente',
    items: [
      { name: 'Proveedores', path: '/proveedores', icon: Truck  },
      { name: 'Vendedores',  path: '/vendedores',  icon: Users  },
    ]
  },
  {
    label: 'Inteligencia',
    role: 'gerente',
    items: [
      { name: 'IA Empresarial', path: '/ia', icon: Brain },
    ]
  },
  {
    label: 'Operaciones',
    role: 'operador',
    items: [
      { name: 'Cargar Archivos', path: '/upload', icon: Upload },
    ]
  }
];

const Sidebar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { sidebarOpen, toggleSidebar } = useStore();
  const { user, logout } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    if (window.innerWidth < 1024) toggleSidebar();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`
      fixed top-0 left-0 z-30 h-screen
      border-r border-slate-200/80 bg-white/95 backdrop-blur-xl
      flex flex-col
      transition-all duration-300 ease-in-out overflow-hidden shadow-sm
      ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}
    `}>
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-3 border-b border-slate-200/80 shrink-0 min-w-[5rem]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src="/icon-192.png" alt="Zentra Alpina" className="h-12 w-12 rounded-xl shrink-0 object-cover shadow-sm" loading="lazy" />
          {sidebarOpen && (
            <span className="font-extrabold text-lg bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              Zentra Alpina
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-800 hover:bg-slate-200 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen
            ? <><X className="h-4 w-4 lg:hidden" /><ChevronLeft className="h-4 w-4 hidden lg:block" /></>
            : <ChevronRight className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5 min-w-[5rem]">
        {menuSections.filter(section => section.role === user?.role).map(section => (
          <div key={section.label}>
            {sidebarOpen && (
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800 px-3 mb-1.5 whitespace-nowrap">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 group relative text-xs font-medium
                      ${isActive
                        ? 'bg-blue-50/90 text-blue-700 font-bold border border-blue-200/80 shadow-xs'
                        : 'text-slate-800 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'}
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-600 rounded-r" />
                    )}
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-700'}`} />
                    {sidebarOpen && (
                      <span className="text-[13px] tracking-wide whitespace-nowrap">{item.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — usuario + logout */}
      <div className="p-4 border-t border-slate-200/80 shrink-0 min-w-[5rem] bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-slate-900 shrink-0 shadow-md uppercase">
            {user?.username?.[0] || 'U'}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-bold text-slate-800 truncate capitalize">{user?.username}</h4>
              <p className="text-[10px] font-medium text-slate-600 truncate capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
