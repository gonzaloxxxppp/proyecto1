'use client';

import React, { useState } from 'react';
import { 
  Users, UserPlus, Search, Edit2, Trash2, Eye, EyeOff, 
  Download, Plus, X, UserCheck, AlertCircle, 
  Copy, Check, Shield, Users2, ChevronRight
} from 'lucide-react';
import { Afiliado, Familiar, OrganizacionAfiliado } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface AfiliadosTabProps {
  afiliados: Afiliado[];
  onRefresh: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  onOpenSqlGuide: () => void;
}

export const AfiliadosTab: React.FC<AfiliadosTabProps> = ({
  afiliados,
  onRefresh,
  showToast,
  onOpenSqlGuide
}) => {
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<'TODOS' | 'SUTIAGA' | 'MUTUAL' | 'AMBAS'>('TODOS');
  
  // State for show/hide passwords
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedDni, setCopiedDni] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Afiliado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View family members modal
  const [viewingFamilyAfiliado, setViewingFamilyAfiliado] = useState<Afiliado | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    dni: string;
    nombre_completo: string;
    correo: string;
    contrasena: string;
    organizacion: OrganizacionAfiliado;
    familiares: Familiar[];
  }>({
    dni: '',
    nombre_completo: '',
    correo: '',
    contrasena: '12345',
    organizacion: 'SUTIAGA',
    familiares: []
  });

  // Calculate metrics
  const totalCount = afiliados.length;
  const sutiagaCount = afiliados.filter(a => a.organizacion === 'SUTIAGA' || a.organizacion === 'AMBAS').length;
  const mutualCount = afiliados.filter(a => a.organizacion === 'MUTUAL' || a.organizacion === 'AMBAS').length;
  const ambasCount = afiliados.filter(a => a.organizacion === 'AMBAS').length;

  // Filter affiliates
  const filteredAfiliados = afiliados.filter(afiliado => {
    // Filter by organization
    if (orgFilter === 'SUTIAGA') {
      if (afiliado.organizacion !== 'SUTIAGA' && afiliado.organizacion !== 'AMBAS') return false;
    } else if (orgFilter === 'MUTUAL') {
      if (afiliado.organizacion !== 'MUTUAL' && afiliado.organizacion !== 'AMBAS') return false;
    } else if (orgFilter === 'AMBAS') {
      if (afiliado.organizacion !== 'AMBAS') return false;
    }

    // Filter by search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchDni = afiliado.dni?.toLowerCase().includes(q);
      const matchName = afiliado.nombre_completo?.toLowerCase().includes(q);
      const matchEmail = afiliado.correo?.toLowerCase().includes(q);
      const matchFamily = afiliado.familiares?.some(f => 
        f.dni?.toLowerCase().includes(q) || f.nombre?.toLowerCase().includes(q)
      );
      return matchDni || matchName || matchEmail || matchFamily;
    }

    return true;
  });

  const togglePasswordVisibility = (dni: string) => {
    setVisiblePasswords(prev => ({ ...prev, [dni]: !prev[dni] }));
  };

  const copyToClipboard = (text: string, dni: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDni(dni);
    setTimeout(() => setCopiedDni(null), 2000);
    showToast('info', 'Contraseña copiada al portapapeles');
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, contrasena: result }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      dni: '',
      nombre_completo: '',
      correo: '',
      contrasena: '12345',
      organizacion: 'SUTIAGA',
      familiares: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (afiliado: Afiliado) => {
    setModalMode('edit');
    setFormData({
      dni: afiliado.dni,
      nombre_completo: afiliado.nombre_completo,
      correo: afiliado.correo,
      contrasena: afiliado.contrasena,
      organizacion: afiliado.organizacion || 'SUTIAGA',
      familiares: Array.isArray(afiliado.familiares) ? [...afiliado.familiares] : []
    });
    setIsModalOpen(true);
  };

  const handleAddFamiliar = () => {
    setFormData(prev => ({
      ...prev,
      familiares: [
        ...prev.familiares,
        { dni: '', nombre: '', parentesco: 'Hijo/a' }
      ]
    }));
  };

  const handleFamiliarChange = (index: number, field: keyof Familiar, value: string) => {
    setFormData(prev => {
      const updated = [...prev.familiares];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, familiares: updated };
    });
  };

  const handleRemoveFamiliar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      familiares: prev.familiares.filter((_, i) => i !== index)
    }));
  };

  const handleSaveAfiliado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dni.trim() || !formData.nombre_completo.trim() || !formData.correo.trim()) {
      showToast('warning', 'Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSaving(true);
    try {
      // Clean up familiares
      const cleanedFamiliares = formData.familiares.filter(f => f.dni.trim() !== '' || f.nombre.trim() !== '');

      const payload = {
        dni: formData.dni.trim(),
        nombre_completo: formData.nombre_completo.trim(),
        correo: formData.correo.trim().toLowerCase(),
        contrasena: formData.contrasena.trim(),
        organizacion: formData.organizacion,
        familiares: cleanedFamiliares
      };

      if (modalMode === 'create') {
        const { error } = await supabase.from('afiliados').insert([payload]);
        if (error) {
          if (error.code === '23505') {
            throw new Error(`El DNI ${formData.dni} ya se encuentra registrado.`);
          }
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Afiliado ${payload.nombre_completo} creado correctamente`);
      } else {
        const { error } = await supabase
          .from('afiliados')
          .update({
            nombre_completo: payload.nombre_completo,
            correo: payload.correo,
            contrasena: payload.contrasena,
            organizacion: payload.organizacion,
            familiares: payload.familiares
          })
          .eq('dni', payload.dni);

        if (error) {
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Afiliado ${payload.nombre_completo} actualizado correctamente`);
      }

      setIsModalOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al guardar afiliado';
      showToast('error', errorMsg, 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAfiliado = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('afiliados')
        .delete()
        .eq('dni', deleteTarget.dni);

      if (error) {
        if (error.message.includes('row-level security') || error.code === '42501') {
          throw new Error('Permisos RLS bloqueados. Ejecuta el script SQL en Supabase para habilitar borrado.');
        }
        throw error;
      }

      showToast('success', `Afiliado ${deleteTarget.nombre_completo} eliminado.`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo eliminar el afiliado';
      showToast('error', errorMsg, 'Error al dar de baja');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    if (filteredAfiliados.length === 0) {
      showToast('warning', 'No hay datos para exportar con los filtros actuales');
      return;
    }

    const headers = ['DNI', 'Nombre Completo', 'Correo', 'Contraseña', 'Organización', 'Cant. Familiares', 'Detalle Familiares'];
    const rows = filteredAfiliados.map(a => {
      const familiaresTxt = (a.familiares || [])
        .map(f => `${f.nombre} (DNI: ${f.dni}${f.parentesco ? ` - ${f.parentesco}` : ''})`)
        .join('; ');

      return [
        `"${a.dni}"`,
        `"${a.nombre_completo}"`,
        `"${a.correo}"`,
        `"${a.contrasena}"`,
        `"${a.organizacion || 'SUTIAGA'}"`,
        a.familiares?.length || 0,
        `"${familiaresTxt}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `afiliados_${orgFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Archivo CSV descargado con éxito');
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setOrgFilter('TODOS')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'TODOS' ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Afiliados</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500">registrados</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('SUTIAGA')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'SUTIAGA' ? 'border-sky-500 shadow-md ring-2 ring-sky-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">SUTIAGA</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{sutiagaCount}</span>
            <span className="text-xs text-slate-500">con Sutiaga</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('MUTUAL')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'MUTUAL' ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">MUTUAL</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{mutualCount}</span>
            <span className="text-xs text-slate-500">con Mutual</span>
          </div>
        </div>

        <div 
          onClick={() => setOrgFilter('AMBAS')}
          className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all ${
            orgFilter === 'AMBAS' ? 'border-purple-500 shadow-md ring-2 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">AMBAS ORGANIZACIONES</span>
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

      {/* Action Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombre, Correo o Familiar..."
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
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setOrgFilter('TODOS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              orgFilter === 'TODOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalCount})
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

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Afiliado</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAfiliados.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No se encontraron afiliados</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {searchTerm 
                ? `No hay afiliados que coincidan con la búsqueda "${searchTerm}".`
                : 'Aún no hay afiliados cargados en la base de datos o en este filtro.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Primer Afiliado</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">DNI (Clave)</th>
                  <th className="py-3.5 px-4">Nombre Completo</th>
                  <th className="py-3.5 px-4">Correo (Login App)</th>
                  <th className="py-3.5 px-4">Contraseña</th>
                  <th className="py-3.5 px-4">Organización</th>
                  <th className="py-3.5 px-4 text-center">Familiares</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAfiliados.map((afiliado) => {
                  const isPassVisible = visiblePasswords[afiliado.dni];
                  const familiaresCount = Array.isArray(afiliado.familiares) ? afiliado.familiares.length : 0;

                  return (
                    <tr key={afiliado.dni} className="hover:bg-slate-50/60 transition-colors">
                      {/* DNI */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {afiliado.dni}
                      </td>

                      {/* Nombre */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {afiliado.nombre_completo}
                      </td>

                      {/* Correo */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                          {afiliado.correo}
                        </span>
                      </td>

                      {/* Contraseña */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-700">
                            {isPassVisible ? afiliado.contrasena : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(afiliado.dni)}
                            title={isPassVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(afiliado.contrasena, afiliado.dni)}
                            title="Copiar contraseña"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          >
                            {copiedDni === afiliado.dni ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Organizacion */}
                      <td className="py-3.5 px-4">
                        {afiliado.organizacion === 'SUTIAGA' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            SUTIAGA
                          </span>
                        )}
                        {afiliado.organizacion === 'MUTUAL' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            MUTUAL
                          </span>
                        )}
                        {afiliado.organizacion === 'AMBAS' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            AMBAS (Sutiaga + Mutual)
                          </span>
                        )}
                        {!afiliado.organizacion && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            SUTIAGA
                          </span>
                        )}
                      </td>

                      {/* Familiares Badge / Button */}
                      <td className="py-3.5 px-4 text-center">
                        {familiaresCount > 0 ? (
                          <button
                            onClick={() => setViewingFamilyAfiliado(afiliado)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{familiaresCount} {familiaresCount === 1 ? 'familiar' : 'familiares'}</span>
                            <ChevronRight className="w-3 h-3 text-indigo-400" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin familiares</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(afiliado)}
                            title="Modificar Afiliado"
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(afiliado)}
                            title="Dar de Baja"
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear / Editar Afiliado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  {modalMode === 'create' ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Alta de Afiliado' : 'Modificación de Afiliado'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create' 
                      ? 'Ingresa los datos para registrar un nuevo afiliado y sus familiares'
                      : `Editando afiliado DNI: ${formData.dni}`}
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

            {/* Modal Form */}
            <form onSubmit={handleSaveAfiliado} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* DNI */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DNI (Clave Única) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="Ej. 35123456"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 font-mono text-slate-800"
                  />
                  {modalMode === 'edit' && (
                    <span className="text-[11px] text-slate-400 mt-0.5 block">El DNI es la clave y no se puede modificar.</span>
                  )}
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos González"
                    value={formData.nombre_completo}
                    onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico (Login App) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Contraseña <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Generar aleatoria
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contraseña de acceso"
                    value={formData.contrasena}
                    onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Organización Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Organización de Pertenencia <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    formData.organizacion === 'SUTIAGA' 
                      ? 'border-sky-500 bg-sky-50/50 text-sky-900 font-semibold ring-2 ring-sky-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion" 
                      value="SUTIAGA"
                      checked={formData.organizacion === 'SUTIAGA'}
                      onChange={() => setFormData({ ...formData, organizacion: 'SUTIAGA' })}
                      className="sr-only"
                    />
                    <Shield className="w-5 h-5 text-sky-600" />
                    <span className="text-xs">Solo SUTIAGA</span>
                  </label>

                  <label className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    formData.organizacion === 'MUTUAL' 
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold ring-2 ring-emerald-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion" 
                      value="MUTUAL"
                      checked={formData.organizacion === 'MUTUAL'}
                      onChange={() => setFormData({ ...formData, organizacion: 'MUTUAL' })}
                      className="sr-only"
                    />
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">Solo MUTUAL</span>
                  </label>

                  <label className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    formData.organizacion === 'AMBAS' 
                      ? 'border-purple-500 bg-purple-50/50 text-purple-900 font-semibold ring-2 ring-purple-500/20' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <input 
                      type="radio" 
                      name="organizacion" 
                      value="AMBAS"
                      checked={formData.organizacion === 'AMBAS'}
                      onChange={() => setFormData({ ...formData, organizacion: 'AMBAS' })}
                      className="sr-only"
                    />
                    <Users2 className="w-5 h-5 text-purple-600" />
                    <span className="text-xs">AMBAS (Sutiaga + Mutual)</span>
                  </label>
                </div>
              </div>

              {/* Familiares Section */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Grupo Familiar Vinculado</h4>
                    <p className="text-xs text-slate-500">DNI y nombres correspondientes de los familiares</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFamiliar}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Familiar</span>
                  </button>
                </div>

                {formData.familiares.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/50">
                    No hay familiares asociados. Si este afiliado tiene familiares a cargo, haz clic en "+ Agregar Familiar".
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.familiares.map((familiar, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {/* DNI */}
                        <div className="w-1/3">
                          <input
                            type="text"
                            placeholder="DNI Familiar"
                            value={familiar.dni}
                            onChange={(e) => handleFamiliarChange(idx, 'dni', e.target.value.replace(/\D/g, ''))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-blue-500 text-slate-800"
                          />
                        </div>

                        {/* Nombre */}
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Nombre y Apellido"
                            value={familiar.nombre}
                            onChange={(e) => handleFamiliarChange(idx, 'nombre', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-800"
                          />
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFamiliar(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Footer */}
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
                  {isSaving ? 'Guardando...' : (modalMode === 'create' ? 'Registrar Afiliado' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Familiares */}
      {viewingFamilyAfiliado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Grupo Familiar</h3>
                  <p className="text-xs text-slate-500">
                    Afiliado: {viewingFamilyAfiliado.nombre_completo} (DNI: {viewingFamilyAfiliado.dni})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingFamilyAfiliado(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {viewingFamilyAfiliado.familiares && viewingFamilyAfiliado.familiares.length > 0 ? (
                <div className="space-y-3">
                  {viewingFamilyAfiliado.familiares.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{f.nombre}</div>
                        <div className="text-xs font-mono text-slate-500">DNI: {f.dni}</div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-200/70 text-slate-700">
                        {f.parentesco || 'Familiar'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Este afiliado no tiene familiares registrados.
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewingFamilyAfiliado(null)}
                  className="px-4 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Baja */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Confirmar Baja de Afiliado</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              ¿Estás seguro de que deseas eliminar al afiliado <strong className="text-slate-800">{deleteTarget.nombre_completo}</strong> (DNI: {deleteTarget.dni})? Esta acción no se puede deshacer.
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
                onClick={handleDeleteAfiliado}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-all"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Dar de Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
