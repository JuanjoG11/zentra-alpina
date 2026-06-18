import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/useStore';
import alpinaLogo from '../../assets/alpina-logo.svg';
import {
  BarChart3, TrendingUp, RefreshCw, Truck, Users,
  Brain, Upload, ChevronLeft, ChevronRight, Sparkles, X
} from 'lucide-react';

const menuSections = [
  {
    label: 'Analítica',
    items: [
      { name: 'Dashboard Ejecutivo', path: '/',            icon: BarChart3  },
      { name: 'Análisis de Ventas',  path: '/ventas',      icon: TrendingUp },
      { name: 'Devoluciones',        path: '/devoluciones', icon: RefreshCw  },
      { name: 'Focos Numérica',      path: '/focos',        icon: Sparkles   },
    ]
  },
  {
    label: 'Comercial',
    items: [
      { name: 'Proveedores', path: '/proveedores', icon: Truck  },
      { name: 'Vendedores',  path: '/vendedores',  icon: Users  },
    ]
  },
  {
    label: 'Inteligencia',
    items: [
      { name: 'IA Empresarial',  path: '/ia',     icon: Brain  },
      { name: 'Cargar Archivos', path: '/upload', icon: Upload },
    ]
  }
];

const Sidebar = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { sidebarOpen, toggleSidebar } = useStore();

  const handleNav = (path) => {
    navigate(path);
    // Cierra el sidebar en móvil al navegar
    if (window.innerWidth < 1024) toggleSidebar();
  };

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <aside className={`
      fixed top-0 left-0 z-30 h-screen
      border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl
      flex flex-col
      transition-all duration-300 ease-in-out overflow-hidden
      ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'}
    `}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0 min-w-[5rem]">
        <div className="flex items-center gap-2 overflow-hidden">
          <img src={alpinaLogo} alt="Alpina" className="h-8 w-auto shrink-0" loading="lazy" />
          {sidebarOpen && (
            <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
              Alpina BI
            </span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors shrink-0"
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
        {menuSections.map(section => (
          <div key={section.label}>
            {sidebarOpen && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-1.5 whitespace-nowrap">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl
                      transition-all duration-200 group relative
                      ${isActive
                        ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'}
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-blue-500 rounded-r" />
                    )}
                    <Icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
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

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/80 flex items-center gap-3 shrink-0 min-w-[5rem]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-lg">
          JJ
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-200 truncate">Juan José</h4>
            <p className="text-[10px] text-slate-500 truncate">Gerente Comercial</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
