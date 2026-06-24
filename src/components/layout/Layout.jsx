import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useStore from '../../store/useStore';

const Layout = () => {
  const { sidebarOpen, toggleSidebar, fetchDataFromSupabase, generateNotifications } = useStore();

  useEffect(() => {
    fetchDataFromSupabase();
    // Generar notificaciones desde los datos persistidos al arrancar
    generateNotifications();
  }, [fetchDataFromSupabase, generateNotifications]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[100px] animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Overlay móvil para cerrar el sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Topbar />

        {/*
          Padding izquierdo:
          - móvil (< lg): 0 — sidebar es overlay, no empuja el contenido
          - lg con sidebar cerrado: pl-20 (5rem = w-20)
          - lg con sidebar abierto: pl-64 (16rem = w-64)
        */}
        <main className={`
          flex-1 pt-20 px-4 pb-6
          transition-all duration-300 ease-in-out
          lg:px-6
          ${sidebarOpen ? 'lg:pl-[17rem]' : 'lg:pl-[6rem]'}
        `}>
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
