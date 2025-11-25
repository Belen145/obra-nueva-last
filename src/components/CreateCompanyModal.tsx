import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (companyId: number) => void;
}

export default function CreateCompanyModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateCompanyModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'El nombre de la compañía es obligatorio'
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🏢 Creando nueva compañía:', companyName);
      
      const { data: company, error } = await supabase
        .from('company')
        .insert({
          name: companyName.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error al crear compañía:', error);
        throw error;
      }

      console.log('✅ Compañía creada exitosamente:', company);
      
      showNotification({
        type: 'success',
        title: 'Compañía creada',
        body: `La inmobiliaria "${companyName}" se ha creado correctamente`
      });

      // Resetear formulario
      setCompanyName('');
      
      // Llamar callback de éxito si existe
      onSuccess?.(company.id);
      
      // Cerrar modal
      onClose();

    } catch (error: any) {
      console.error('💥 Error creando compañía:', error);
      
      showNotification({
        type: 'error',
        title: 'Error al crear compañía',
        body: error.message || 'Ha ocurrido un error inesperado'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCompanyName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            🏢 Crear Nueva Inmobiliaria
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Inmobiliaria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              placeholder="Ej: Inmobiliaria García S.L."
              maxLength={100}
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              Máximo 100 caracteres
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creando...
                </>
              ) : (
                '✅ Crear Inmobiliaria'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}