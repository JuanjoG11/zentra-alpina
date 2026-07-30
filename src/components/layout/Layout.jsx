import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useStore from '../../store/useStore';
import { useRegisterSW } from 'virtual:pwa-register/react';

const Layout = () => {
  const { sidebarOpen, toggleSidebar, fetchDataFromSupabase, generateNotifications } = useStore();

  // PWA: detectar nueva versión y ofrecer recarga
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Chequear updates cada 60 segundos
      if (r) setInterval(() => r.update(), 60 * 1000);
    },
  });

  useEffect(() => {
    fetchDataFromSupabase();
    generateNotifications();
  }, [fetchDataFromSupabase, generateNotifications]);

  // Re-sincronizar datos automáticamente cada 30 segundos (tiempo real multiterminal)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataFromSupabase();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchDataFromSupabase]);


  // Re-sincronizar cuando el usuario vuelve a la pestaña/app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDataFromSupabase();
      }
    };
    const handleFocus = () => fetchDataFromSupabase();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDataFromSupabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">

      {/* Banner de nueva versión disponible */}
      {needRefresh && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/30 border border-blue-400/30 text-white text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
          <span>🚀 Nueva versión disponible</span>
          <button
            onClick={async () => {
              await updateServiceWorker(true);
              // Forzar recarga dura para limpiar caché del SW
              window.location.reload();
            }}
            className="px-3 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors"
          >
            Actualizar ahora
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-blue-200 hover:text-white text-xs"
          >
            Después
          </button>
        </div>
      )}
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
          flex-1 pt-[4.5rem] px-3 pb-4
          transition-all duration-300 ease-in-out
          lg:px-5
          ${sidebarOpen ? 'lg:pl-[17rem]' : 'lg:pl-[6rem]'}
        `}>
          <div className="max-w-7xl mx-auto space-y-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
