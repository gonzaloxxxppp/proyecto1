'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

interface LoginGateProps {
  onSuccess: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onSuccess }) => {
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState(false);
  const [remember, setRemember] = useState(true);

  const expectedKey = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY || 'sutiaga2026';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey.trim() === expectedKey.trim()) {
      setError(false);
      if (remember) {
        localStorage.setItem('sutiaga_admin_auth', 'authenticated');
      } else {
        sessionStorage.setItem('sutiaga_admin_auth', 'authenticated');
      }
      onSuccess();
    } else {
      setError(true);
      setAccessKey('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-8 space-y-6 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-blue-500/30">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wide uppercase border border-blue-200/60 mb-1">
                <Lock className="w-3 h-3 text-blue-600" />
                Acceso Protegido
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                SUTIAGA & MUTUAL
              </h1>
              <p className="text-xs text-slate-500">
                Sistema de Gestión de Afiliados y Convenios
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Clave de Acceso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Ingresa la clave de administración..."
                  value={accessKey}
                  onChange={(e) => {
                    setAccessKey(e.target.value);
                    if (error) setError(false);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-mono text-slate-800 ${
                    error
                      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/50'
                      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Clave de acceso incorrecta. Intente nuevamente.</span>
                </div>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Recordar sesión en este equipo</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span>Ingresar al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 text-center">
          </div>
        </div>
      </div>
    </div>
  );
};
