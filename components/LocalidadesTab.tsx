'use client';

import React, { useState } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, X, AlertCircle, Building2 } from 'lucide-react';
import { Localidad, Beneficio } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface LocalidadesTabProps {
  localidades: Localidad[];
  beneficios: Beneficio[];
  onRefresh: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

const PROVINCIAS_ARGENTINAS = [
  'Chubut', 'Santa Cruz', 'Tierra del Fuego'
];

export const LocalidadesTab: React.FC<LocalidadesTabProps> = ({
  localidades,
  beneficios,
  onRefresh,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Localidad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    id?: number;
    localidad: string;
    provincia: string;
  }>({
    localidad: '',
    provincia: 'Chubut'
  });

  // Calculate stats
  const totalLocalidades = localidades.length;
  const uniqueProvincias = new Set(localidades.map(l => l.provincia)).size;

  // Filtered
  const filteredLocalidades = localidades.filter(l => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return l.localidad.toLowerCase().includes(q) || l.provincia.toLowerCase().includes(q);
  });

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      localidad: '',
      provincia: 'Chubut'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (loc: Localidad) => {
    setModalMode('edit');
    setFormData({
      id: loc.id,
      localidad: loc.localidad,
      provincia: loc.provincia
    });
    setIsModalOpen(true);
  };

  const handleSaveLocalidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.localidad.trim() || !formData.provincia.trim()) {
      showToast('warning', 'Por favor ingresa el nombre de la localidad y la provincia.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        localidad: formData.localidad.trim(),
        provincia: formData.provincia.trim()
      };

      if (modalMode === 'create') {
        const { error } = await supabase.from('localidades').insert([payload]);
        if (error) {
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Localidad "${payload.localidad}" agregada correctamente.`);
      } else {
        const { error } = await supabase
          .from('localidades')
          .update(payload)
          .eq('id', formData.id);

        if (error) {
          if (error.message.includes('row-level security') || error.code === '42501') {
            throw new Error('Permisos RLS bloqueados. Ve a la pestaña Configuración SQL y ejecuta el script en Supabase.');
          }
          throw error;
        }
        showToast('success', `Localidad "${payload.localidad}" actualizada correctamente.`);
      }

      setIsModalOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al guardar localidad';
      showToast('error', errorMsg, 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocalidad = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('localidades')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) {
        if (error.message.includes('row-level security') || error.code === '42501') {
          throw new Error('Permisos RLS bloqueados. Ejecuta el script SQL en Supabase para habilitar borrado.');
        }
        throw error;
      }

      showToast('success', `Localidad "${deleteTarget.localidad}" eliminada.`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo eliminar la localidad';
      showToast('error', errorMsg, 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Localidades</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalLocalidades}</span>
            <span className="text-xs text-slate-500">ciudades registradas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Provincias</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{uniqueProvincias}</span>
            <span className="text-xs text-slate-500">provincias cubiertas</span>
          </div>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por localidad o provincia..."
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

        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Localidad</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLocalidades.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No se encontraron localidades</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {searchTerm 
                ? `No hay coincidencias para "${searchTerm}".`
                : 'Aún no hay localidades cargadas en el sistema.'}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primera Localidad</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-24">ID</th>
                  <th className="py-3.5 px-4">Localidad</th>
                  <th className="py-3.5 px-4">Provincia</th>
                  <th className="py-3.5 px-4 text-center">Beneficios Asociados</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLocalidades.map((loc) => {
                  const associatedBenefits = beneficios.filter(
                    b => b.localidad?.toLowerCase() === loc.localidad?.toLowerCase()
                  ).length;

                  return (
                    <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        #{loc.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {loc.localidad}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {loc.provincia}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          associatedBenefits > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {associatedBenefits} {associatedBenefits === 1 ? 'beneficio' : 'beneficios'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(loc)}
                            title="Editar localidad"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(loc)}
                            title="Eliminar localidad"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Modal: Crear / Editar Localidad */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Nueva Localidad' : 'Editar Localidad'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create' ? 'Agrega una ciudad o localidad' : `Editando ID: ${formData.id}`}
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

            <form onSubmit={handleSaveLocalidad} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Localidad <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rosario, Rafaela, San Lorenzo..."
                  value={formData.localidad}
                  onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provincia <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                >
                  {PROVINCIAS_ARGENTINAS.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

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
                  {isSaving ? 'Guardando...' : (modalMode === 'create' ? 'Agregar Localidad' : 'Guardar Cambios')}
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
              ¿Deseas eliminar la localidad <strong className="text-slate-800">{deleteTarget.localidad} ({deleteTarget.provincia})</strong>?
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
                onClick={handleDeleteLocalidad}
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
