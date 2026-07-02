import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * requiredRole: 'gerente' | 'operador' | null (cualquier usuario logueado)
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user } = useAuth();
  const location = useLocation();

  // No logueado → al login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Operador intentando acceder a rutas de gerente → redirigir a upload
  if (requiredRole === 'gerente' && user.role !== 'gerente') {
    return <Navigate to="/upload" replace />;
  }

  // Gerente intentando acceder a rutas de operador → redirigir al dashboard
  if (requiredRole === 'operador' && user.role !== 'operador') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
