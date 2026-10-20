'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { AfiliadosTab } from '@/components/AfiliadosTab';
import { BeneficiosTab } from '@/components/BeneficiosTab';
import { LocalidadesTab } from '@/components/LocalidadesTab';
import { SqlGuideTab } from '@/components/SqlGuideTab';
import { LoginGate } from '@/components/LoginGate';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { Afiliado, Beneficio, Localidad } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<'afiliados' | 'beneficios' | 'localidades' | 'sql'>('afiliados');
  const [afiliados, setAfiliados] = useState<Afiliado[]>([]);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [rlsNotice, setRlsNotice] = useState(false);

  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Afiliados
      const { data: afilData, error: afilError } = await supabase
        .from('afiliados')
        .select('*')
        .order('nombre_completo', { ascending: true });

      if (afilError) {
        console.error('Error fetching afiliados:', afilError);
        if (afilError.code === '42501' || afilError.message.includes('row-level security')) {
          setRlsNotice(true);
        }
      } else if (afilData) {
        setAfiliados(afilData as Afiliado[]);
      }

      // 2. Fetch Beneficios
      const { data: benData, error: benError } = await supabase
        .from('beneficios')
        .select('*')
        .order('id', { ascending: false });

      if (benError) {
        console.error('Error fetching beneficios:', benError);
        if (benError.code === '42501' || benError.message.includes('row-level security')) {
          setRlsNotice(true);
        }
      } else if (benData) {
        setBeneficios(benData as Beneficio[]);
      }

      // 3. Fetch Localidades
      const { data: locData, error: locError } = await supabase
        .from('localidades')
        .select('*')
        .order('localidad', { ascending: true });

      if (locError) {
        console.error('Error fetching localidades:', locError);
        if (locError.code === '42501' || locError.message.includes('row-level security')) {
          setRlsNotice(true);
        }
      } else if (locData) {
        setLocalidades(locData as Localidad[]);
      }
    } catch (err) {
      console.error('General load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on initial load
  useEffect(() => {
    try {
      const isAuth =
        localStorage.getItem('sutiaga_admin_auth') === 'authenticated' ||
        sessionStorage.getItem('sutiaga_admin_auth') === 'authenticated';

      if (isAuth) {
        setIsAuthenticated(true);
        loadData();
      }
    } catch (e) {
      console.error('Error checking auth:', e);
    }
  }, [loadData]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadData();
    showToast('success', 'Bienvenido al panel de gestión de SUTIAGA & Mutual');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('sutiaga_admin_auth');
      sessionStorage.removeItem('sutiaga_admin_auth');
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    showToast('info', 'Sesión cerrada correctamente');
  };

  // If not authenticated, block viewing and display LoginGate
  if (!isAuthenticated) {
    return (
      <>
        <LoginGate onSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          afiliados: afiliados.length,
          beneficios: beneficios.length,
          localidades: localidades.length,
        }}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* RLS Reminder Banner */}
        {rlsNotice && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Configuración de Supabase requerida: </span>
                <span>
                  Para habilitar las Altas, Bajas y Modificaciones en tiempo real, ejecuta el script SQL en Supabase.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('sql')}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Ver Script SQL
            </button>
          </div>
        )}

        {/* Dynamic Tab Content */}
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Cargando base de datos de SUTIAGA & Mutual...</p>
          </div>
        ) : (
          <>
            {activeTab === 'afiliados' && (
              <AfiliadosTab
                afiliados={afiliados}
                onRefresh={loadData}
                showToast={showToast}
                onOpenSqlGuide={() => setActiveTab('sql')}
              />
            )}

            {activeTab === 'beneficios' && (
              <BeneficiosTab
                beneficios={beneficios}
                localidades={localidades}
                onRefresh={loadData}
                showToast={showToast}
                onOpenLocalidadesTab={() => setActiveTab('localidades')}
              />
            )}

            {activeTab === 'localidades' && (
              <LocalidadesTab
                localidades={localidades}
                beneficios={beneficios}
                onRefresh={loadData}
                showToast={showToast}
              />
            )}

            {activeTab === 'sql' && (
              <SqlGuideTab
                onRefreshData={loadData}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>SUTIAGA & Mutual • Panel de Control de Afiliados y Beneficios</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Conectado a Supabase (yufhvklzfrbvxmmuejxh)
          </span>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
