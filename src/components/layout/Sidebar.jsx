import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../../store/useStore';
import alpinaLogo from '../../assets/alpina-logo.svg';
import { 
  BarChart3, 
  TrendingUp, 
  RefreshCw, 
  Truck, 
  Users, 
  Brain, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Sparkles
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useStore();

  const menuItems = [
    { name: 'Dashboard Ejecutivo', path: '/', icon: BarChart3 },
    { name: 'Análisis de Ventas', path: '/ventas', icon: TrendingUp },
    { name: 'Devoluciones', path: '/devoluciones', icon: RefreshCw },
    { name: 'Focos Numérica', path: '/focos', icon: Sparkles },
    { name: 'Proveedores', path: '/proveedores', icon: Truck },
    { name: 'Vendedores', path: '/vendedores', icon: Users },
    { name: 'IA Empresarial', path: '/ia', icon: Brain },
    { name: 'Cargar Archivos', path: '/upload', icon: Upload }
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
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
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-600/10 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r" />
              )}
              
              <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              
              {sidebarOpen && (
                <span className="text-sm tracking-wide transition-opacity duration-300">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-sm text-white shrink-0">
          JJ
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-200 truncate">Juan José</h4>
            <p className="text-[10px] text-slate-500 truncate">Administrador</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
