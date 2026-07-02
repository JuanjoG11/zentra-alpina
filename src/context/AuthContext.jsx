import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Credenciales hardcodeadas — simple y sin dependencias externas
const USERS = {
  gerente: { password: 'alpina2026', role: 'gerente' },
  operador: { password: 'carga2026', role: 'operador' },
};

const SESSION_KEY = 'zentra_auth';

const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadSession);

  const login = (username, password) => {
    const found = USERS[username.toLowerCase()];
    if (!found || found.password !== password) {
      return { ok: false, error: 'Usuario o contraseña incorrectos' };
    }
    const session = { username: username.toLowerCase(), role: found.role };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true, role: found.role };
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
