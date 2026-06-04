import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import useStore from '../../store/useStore';

const Layout = () => {
  const { sidebarOpen, fetchDataFromSupabase } = useStore();

  useEffect(() => {
    fetchDataFromSupabase();
  }, [fetchDataFromSupabase]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glow point 1 */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse duration-[8000ms]" />
        {/* Glow point 2 */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse duration-[12000ms]" />
        {/* Glowing border/accent */}
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[100px] animate-pulse duration-[10000ms]" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Layout Content Wrapper */}
      <div className="flex flex-col min-h-screen relative z-10">
        {/* Topbar Filtering */}
        <Topbar />

        {/* Page Content */}
        <main 
          className="flex-1 p-6 pt-20 transition-all duration-300 ease-in-out"
          style={{ paddingLeft: sidebarOpen ? '17.5rem' : '6.5rem' }}
        >
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
