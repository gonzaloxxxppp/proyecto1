'use client';

import React, { useState } from 'react';
import { 
  Gift, Plus, Search, Edit2, Trash2, MapPin, Building2, 
  Download, X, AlertCircle, Shield, UserCheck, Users2, Tag
} from 'lucide-react';
import { Beneficio, Localidad, OrganizacionTipo } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface BeneficiosTabProps {
  beneficios: Beneficio[];
  localidades: Localidad[];
  onRefresh: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  onOpenLocalidadesTab: () => void;
}

const DEFAULT_SECCIONES = [
  'Automotor',
  'Salud',
  'Hogar y Bazar',
  'Belleza y Bienestar',
  'Comercio',
  'Deporte',
  'Eventos Celebraciones',
  'Gastronomía',
  'Turismo',
  'Educación'
];

export const BeneficiosTab: React.FC<BeneficiosTabProps> = ({
  beneficios,
  localidades,
  onRefresh,
  showToast,
  onOpenLocalidadesTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('TODAS');
  const [selectedSeccion, setSelectedSeccion] = useState<string>('TODAS');
  const [orgFilter, setOrgFilter] = useState<'TODAS' | 'SUTIAGA' | 'MUTUAL' | 'AMBAS'>('TODAS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Beneficio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    id?: number;
    nombre_empresa: string;
    logo: string;
    beneficio: string;
    localidad: string;
    direccion: string;
    organizacion: OrganizacionTipo;
    seccion: string;
  }>({
    nombre_empresa: '',
    logo: '',
    beneficio: '',
    localidad: '',
    direccion: '',
    organizacion: 'AMBAS',
    seccion: 'General'
  });

  // Calculate unique localities
  const allLocalidadesNames = Array.from(
    new Set([
      ...localidades.map(l => l.localidad),
      ...beneficios.map(b => b.localidad).filter(Boolean)
    ])
  ).sort();

  // Calculate unique sections
  const existingSecciones = Array.from(
    new Set(beneficios.map(b => b.seccion).filter(Boolean) as string[])
  );
  const allSeccionesNames = Array.from(
    new Set([...existingSecciones, ...DEFAULT_SECCIONES])
  ).sort();

  // Metrics
  const totalBeneficios = beneficios.length;
  const sutiagaCount = beneficios.filter(b => b.organizacion === 'SUTIAGA' || b.organizacion === 'AMBAS' || !b.organizacion).length;
  const mutualCount = beneficios.filter(b => b.organizacion === 'MUTUAL' || b.organizacion === 'AMBAS' || !b.organizacion).length;
  const ambasCount = beneficios.filter(b => b.organizacion === 'AMBAS' || !b.organizacion).length;

  // Filtered benefits
  const filteredBeneficios = beneficios.filter(beneficio => {
    const org = beneficio.organizacion || 'AMBAS';
    const sec = beneficio.seccion || 'General';

    // Filter by organizacion
    if (orgFilter === 'SUTIAGA') {
      if (org !== 'SUTIAGA' && org !== 'AMBAS') return false;
    } else if (orgFilter === 'MUTUAL') {
      if (org !== 'MUTUAL' && org !== 'AMBAS') return false;
    } else if (orgFilter === 'AMBAS') {
      if (org !== 'AMBAS') return false;
    }

    // Filter by localidad
    if (selectedLocalidad !== 'TODAS' && beneficio.localidad !== selectedLocalidad) {
      return false;
    }

    // Filter by seccion
    if (selectedSeccion !== 'TODAS' && sec.toLowerCase() !== selectedSeccion.toLowerCase()) {
      return false;
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchEmpresa = beneficio.nombre_empresa?.toLowerCase().includes(q);
      const matchDetalle = beneficio.beneficio?.toLowerCase().includes(q);
      const matchDireccion = beneficio.direccion?.toLowerCase().includes(q);
      const matchLocalidad = beneficio.localidad?.toLowerCase().includes(q);
      const matchSeccion = beneficio.seccion?.toLowerCase().includes(q);
      return matchEmpresa || matchDetalle || matchDireccion || matchLocalidad || matchSeccion;
    }

    return true;
  });

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      nombre_empresa: '',
      logo: '',
      beneficio: '',
      localidad: localidades.length > 0 ? localidades[0].localidad : '',
      direccion: '',
      organizacion: 'AMBAS',
      seccion: 'General'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (beneficio: Beneficio) => {
    setModalMode('edit');
    setFormData({
      id: beneficio.id,
      nombre_empresa: beneficio.nombre_empresa,
      logo: beneficio.logo || '',
      beneficio: beneficio.beneficio,
      localidad: beneficio.localidad,
      direccion: beneficio.direccion,
      organizacion: beneficio.organizacion || 'AMBAS',
      seccion: beneficio.seccion || 'General'
    });
    setIsModalOpen(true);
  };

  const handleSaveBeneficio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_empresa.trim() || !formData.beneficio.trim() || !formData.localidad.trim()) {
      showToast('warning', 'Completa la empresa, el beneficio y la localidad.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nombre_empresa: formData.nombre_empresa.trim(),
        logo: formData.logo.trim(),
        beneficio: formData.beneficio.trim(),
        localidad: formData.localidad.trim(),
        direccion: formData.direccion.trim(),
        organizacion: formData.organizacion,
        seccion: formData.seccion.trim() || 'General'
      };

      if (modalMode === 'create') {
        const { error } = await supabase.from('beneficios').insert([payload]);
        if (error) {
          if (error.message.includes('column "seccion"') || error.code === '42703') {
            throw new Error('Falta agregar la columna "seccion" en Supabase. Ejecuta el script SQL en la pestaña "Configuración SQL".');
          }
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Beneficio para "${payload.nombre_empresa}" creado exitosamente.`);
      } else {
        const { error } = await supabase
          .from('beneficios')
          .update(payload)
          .eq('id', formData.id);

        if (error) {
          if (error.message.includes('column "seccion"') || error.code === '42703') {
            throw new Error('Falta agregar la columna "seccion" en Supabase. Ejecuta el script SQL en la pestaña "Configuración SQL".');
          }
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Beneficio de "${payload.nombre_empresa}" actualizado exitosamente.`);
      }

      setIsModalOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al guardar beneficio';
      showToast('error', errorMsg, 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBeneficio = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('beneficios')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) {
        if (error.message.includes('row-level security') || error.code === '42501') {
          throw new Error('Permisos RLS bloqueados. Ejecuta el script SQL en Supabase para habilitar borrado.');
        }
        throw error;
      }

      showToast('success', `Beneficio de "${deleteTarget.nombre_empresa}" eliminado.`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo eliminar el beneficio';
      showToast('error', errorMsg, 'Error al dar de baja');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    if (filteredBeneficios.length === 0) {
      showToast('warning', 'No hay beneficios para exportar');
      return;
    }

    const headers = ['ID', 'Empresa', 'Organización', 'Sección', 'Localidad', 'Dirección o Direcciones', 'Beneficio Detalle', 'URL Logo'];
    const rows = filteredBeneficios.map(b => [
      b.id,
      `"${b.nombre_empresa}"`,
      `"${b.organizacion || 'AMBAS'}"`,
      `"${b.seccion || 'General'}"`,
      `"${b.localidad}"`,
      `"${b.direccion}"`,
      `"${b.beneficio.replace(/"/g, '""')}"`,
      `"${b.logo || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `beneficios_${orgFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Listado de beneficios exportado en CSV');
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setOrgFilter('TODAS')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'TODAS' ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Beneficios</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalBeneficios}</span>
            <span className="text-xs text-slate-500">convenios</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('SUTIAGA')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'SUTIAGA' ? 'border-sky-500 shadow-md ring-2 ring-sky-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Para SUTIAGA</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{sutiagaCount}</span>
            <span className="text-xs text-slate-500">beneficios disponibles</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('MUTUAL')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'MUTUAL' ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Para MUTUAL</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{mutualCount}</span>
            <span className="text-xs text-slate-500">beneficios disponibles</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('AMBAS')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'AMBAS' ? 'border-purple-500 shadow-md ring-2 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Ambas Organizaciones</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{ambasCount}</span>
            <span className="text-xs text-slate-500">compartidos</span>
          </div>
        </div>
      </div>

      {/* Action Bar, Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        {/* Top row: Search and Organization Pills */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por empresa, beneficio, sección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Organization Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <button
              onClick={() => setOrgFilter('TODAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                orgFilter === 'TODAS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({totalBeneficios})
            </button>
            <button
              onClick={() => setOrgFilter('SUTIAGA')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                orgFilter === 'SUTIAGA'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              SUTIAGA ({sutiagaCount})
            </button>
            <button
              onClick={() => setOrgFilter('MUTUAL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                orgFilter === 'MUTUAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              MUTUAL ({mutualCount})
            </button>
            <button
              onClick={() => setOrgFilter('AMBAS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                orgFilter === 'AMBAS'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Ambas ({ambasCount})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={exportToCSV}
              title="Exportar listado a archivo CSV"
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Beneficio</span>
            </button>
          </div>
        </div>

        {/* Second row: Dropdowns for Sección and Localidad */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          {/* Seccion Filter */}
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Sección:</span>
            <select
              value={selectedSeccion}
              onChange={(e) => setSelectedSeccion(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            >
              <option value="TODAS">Todas las Secciones ({totalBeneficios})</option>
              {allSeccionesNames.map((sec, idx) => {
                const count = beneficios.filter(b => (b.seccion || 'General').toLowerCase() === sec.toLowerCase()).length;
                return (
                  <option key={idx} value={sec}>
                    {sec} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Localidad Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Localidad:</span>
            <select
              value={selectedLocalidad}
              onChange={(e) => setSelectedLocalidad(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            >
              <option value="TODAS">Todas las Localidades</option>
              {allLocalidadesNames.map((loc, idx) => (
                <option key={idx} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters shortcut */}
          {(selectedSeccion !== 'TODAS' || selectedLocalidad !== 'TODAS' || orgFilter !== 'TODAS' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedSeccion('TODAS');
                setSelectedLocalidad('TODAS');
                setOrgFilter('TODAS');
                setSearchTerm('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Beneficios Cards Grid */}
      {filteredBeneficios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No se encontraron beneficios</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm || selectedLocalidad !== 'TODAS' || selectedSeccion !== 'TODAS' || orgFilter !== 'TODAS'
              ? 'No hay convenios o beneficios que coincidan con los filtros seleccionados.'
              : 'Aún no se han registrado beneficios en la base de datos.'}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar Primer Beneficio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBeneficios.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                {/* Header with Logo, Company, Organization and Section Badges */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {b.logo ? (
                      <img
                        src={b.logo}
                        alt={b.nombre_empresa}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-base leading-snug truncate mb-1">
                      {b.nombre_empresa}
                    </h3>

                    {/* Badges: Organización, Sección y Localidad */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Organization Badge */}
                      {b.organizacion === 'SUTIAGA' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                          <Shield className="w-3 h-3 text-sky-500" />
                          SUTIAGA
                        </span>
                      )}
                      {b.organizacion === 'MUTUAL' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          MUTUAL
                        </span>
                      )}
                      {(b.organizacion === 'AMBAS' || !b.organizacion) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          <Users2 className="w-3 h-3 text-purple-500" />
                          AMBAS
                        </span>
                      )}

                      {/* Section Badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80">
                        <Tag className="w-3 h-3 text-amber-600" />
                        {b.seccion || 'General'}
                      </span>

                      {/* Location Badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {b.localidad || 'Sin localidad'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beneficio Detail Box */}
                <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 mb-3.5 text-xs text-amber-950 font-medium leading-relaxed">
                  <span className="font-bold text-amber-800 block mb-0.5">Beneficio Otorgado:</span>
                  {b.beneficio}
                </div>

                {/* Direcciones */}
                <div className="text-xs text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{b.direccion || 'Dirección no especificada'}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">ID #{b.id}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar beneficio"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar beneficio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar Beneficio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Nuevo Beneficio' : 'Editar Beneficio'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create' ? 'Registra un convenio comercial o descuento' : `Editando ID: ${formData.id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBeneficio} className="p-6 space-y-4">
              {/* Nombre de la Empresa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Empresa o Comercio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Farmacia San Martín / Supermercado Centro"
                  value={formData.nombre_empresa}
                  onChange={(e) => setFormData({ ...formData, nombre_empresa: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              {/* Selector de Sección / Rubro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sección / Rubro del Convenio <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={DEFAULT_SECCIONES.includes(formData.seccion) ? formData.seccion : 'OTRA'}
                    onChange={(e) => {
                      if (e.target.value !== 'OTRA') {
                        setFormData({ ...formData, seccion: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  >
                    <option value="">Seleccionar sección...</option>
                    {DEFAULT_SECCIONES.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                    <option value="OTRA">Otra (escribir abajo)...</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="O escribe una sección personalizada (ej: Automotor, Salud, Gastronomía...)"
                    value={formData.seccion}
                    onChange={(e) => setFormData({ ...formData, seccion: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Selector de Organización */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Organización a la que aplica el Beneficio <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={`cursor-pointer p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                    formData.organizacion === 'SUTIAGA' 
                      ? 'border-sky-500 bg-sky-50/50 text-sky-900 font-semibold ring-2 ring-sky-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion_beneficio" 
                      value="SUTIAGA"
                      checked={formData.organizacion === 'SUTIAGA'}
                      onChange={() => setFormData({ ...formData, organizacion: 'SUTIAGA' })}
                      className="sr-only"
                    />
                    <Shield className="w-4 h-4 text-sky-600" />
                    <span className="text-xs">Solo SUTIAGA</span>
                  </label>

                  <label className={`cursor-pointer p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                    formData.organizacion === 'MUTUAL' 
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion_beneficio" 
                      value="MUTUAL"
                      checked={formData.organizacion === 'MUTUAL'}
                      onChange={() => setFormData({ ...formData, organizacion: 'MUTUAL' })}
                      className="sr-only"
                    />
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">Solo MUTUAL</span>
                  </label>

                  <label className={`cursor-pointer p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                    formData.organizacion === 'AMBAS' 
                      ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-semibold ring-2 ring-purple-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion_beneficio" 
                      value="AMBAS"
                      checked={formData.organizacion === 'AMBAS'}
                      onChange={() => setFormData({ ...formData, organizacion: 'AMBAS' })}
                      className="sr-only"
                    />
                    <Users2 className="w-4 h-4 text-purple-600" />
                    <span className="text-xs">AMBAS (Compartido)</span>
                  </label>
                </div>
              </div>

              {/* URL Logo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL del Logo (Opcional)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                  {formData.logo && (
                    <div className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={formData.logo} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Localidad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Localidad <span className="text-rose-500">*</span>
                  </label>
                  {localidades.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        onOpenLocalidadesTab();
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      + Agregar localidades
                    </button>
                  )}
                </div>
                {localidades.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                    >
                      <option value="">Selecciona una localidad...</option>
                      {localidades.map((loc) => (
                        <option key={loc.id || loc.localidad} value={loc.localidad}>
                          {loc.localidad} ({loc.provincia})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="O escribe otra localidad manualmente..."
                      value={formData.localidad}
                      onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ej. Rosario"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                  />
                )}
              </div>

              {/* Dirección o Direcciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección o Direcciones <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. San Martín 1234 / Sucursal Pellegrini 450"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              {/* Beneficio Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detalle del Beneficio Otorgado <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. 20% de descuento en medicamentos recetados y 10% en perfumería presentando carnet o DNI."
                  value={formData.beneficio}
                  onChange={(e) => setFormData({ ...formData, beneficio: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all"
                >
                  {isSaving ? 'Guardando...' : (modalMode === 'create' ? 'Crear Beneficio' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Borrado */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Eliminación</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              ¿Deseas eliminar el beneficio de <strong className="text-slate-800">{deleteTarget.nombre_empresa}</strong>? Esta acción lo removerá de la base de datos de la app.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteBeneficio}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-all"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
