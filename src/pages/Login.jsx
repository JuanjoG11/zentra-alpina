import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Pequeño delay para que se sienta real
    await new Promise(r => setTimeout(r, 600));

    const result = login(username.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Redirigir según rol
    navigate(result.role === 'operador' ? '/upload' : '/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-500/10 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] rounded-full bg-cyan-500/5 blur-[100px] animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/40 p-8 md:p-10">

          {/* Logo + nombre */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <img
              src="/icon-192.png"
              alt="Zentra Alpina"
              className="h-24 w-24 rounded-3xl shadow-xl shadow-blue-500/20 border border-slate-700/50"
            />
            <div className="text-center">
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
                Zentra Alpina
              </h1>
              <p className="text-slate-500 text-xs mt-1">Plataforma de inteligencia comercial</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="gerente / operador"
                autoComplete="username"
                required
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-800 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando...</>
                : <><LogIn className="h-4 w-4" /> Ingresar</>
              }
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-600 mt-6">
            Distribuidor Alpina · Eje Cafetero
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
