import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import SalesAnalysis from './pages/SalesAnalysis';
import ReturnsAnalysis from './pages/ReturnsAnalysis';
import ProvidersAnalysis from './pages/ProvidersAnalysis';
import FocosNumerica from './pages/FocosNumerica';
import SellersAnalysis from './pages/SellersAnalysis';
import BusinessIA from './pages/BusinessIA';
import UploadExcel from './pages/UploadExcel';
import ExecutiveProfile from './pages/ExecutiveProfile';
import TVDashboard from './pages/TVDashboard';
import './index.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ExecutiveDashboard />} />
          <Route path="ventas" element={<SalesAnalysis />} />
          <Route path="devoluciones" element={<ReturnsAnalysis />} />
          <Route path="focos" element={<FocosNumerica />} />
          <Route path="proveedores" element={<ProvidersAnalysis />} />
          <Route path="vendedores" element={<SellersAnalysis />} />
          <Route path="ia" element={<BusinessIA />} />
          <Route path="upload" element={<UploadExcel />} />
          <Route path="ejecutivo" element={<ExecutiveProfile />} />
        </Route>
        {/* Ruta sin Layout para modo TV fullscreen */}
        <Route path="tv" element={<TVDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
