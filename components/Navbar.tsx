'use client';

import React from 'react';
import { Users, Gift, MapPin, Database, ShieldCheck, LogOut } from 'lucide-react';

interface NavbarProps {
  activeTab: 'afiliados' | 'beneficios' | 'localidades' | 'sql';
  setActiveTab: (tab: 'afiliados' | 'beneficios' | 'localidades' | 'sql') => void;
  counts: {
    afiliados: number;
    beneficios: number;
    localidades: number;
  };
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, counts, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">SUTIAGA & MUTUAL</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Gestión DB
                </span>
              </div>
              <p className="text-xs text-slate-500">Panel de Administración de Afiliados y Beneficios</p>
            </div>
          </div>

          {/* Right Section: Nav Tabs & Logout */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setActiveTab('afiliados')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'afiliados'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Afiliados</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'afiliados' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {counts.afiliados}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('beneficios')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'beneficios'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Beneficios</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'beneficios' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {counts.beneficios}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('localidades')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'localidades'
                    ? 'bg-white text-blue-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Localidades</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'localidades' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {counts.localidades}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('sql')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'sql'
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Configuración SQL</span>
              </button>
            </nav>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión y bloquear panel"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
