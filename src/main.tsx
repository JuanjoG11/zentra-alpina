import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
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
      <AuthProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas con layout — cualquier usuario logueado */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Solo gerente */}
            <Route index element={<ProtectedRoute requiredRole="gerente"><ExecutiveDashboard /></ProtectedRoute>} />
            <Route path="ventas"      element={<ProtectedRoute requiredRole="gerente"><SalesAnalysis /></ProtectedRoute>} />
            <Route path="devoluciones" element={<ProtectedRoute requiredRole="gerente"><ReturnsAnalysis /></ProtectedRoute>} />
            <Route path="focos"       element={<ProtectedRoute requiredRole="gerente"><FocosNumerica /></ProtectedRoute>} />
            <Route path="proveedores" element={<ProtectedRoute requiredRole="gerente"><ProvidersAnalysis /></ProtectedRoute>} />
            <Route path="vendedores"  element={<ProtectedRoute requiredRole="gerente"><SellersAnalysis /></ProtectedRoute>} />
            <Route path="ia"          element={<ProtectedRoute requiredRole="gerente"><BusinessIA /></ProtectedRoute>} />
            <Route path="ejecutivo"   element={<ProtectedRoute requiredRole="gerente"><ExecutiveProfile /></ProtectedRoute>} />

            {/* Solo operador */}
            <Route path="upload" element={<ProtectedRoute requiredRole="operador"><UploadExcel /></ProtectedRoute>} />
          </Route>

          {/* TV fullscreen — sin layout */}
          <Route path="tv" element={<TVDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
