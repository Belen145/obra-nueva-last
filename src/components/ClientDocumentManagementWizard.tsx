import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useServicesCache } from '../hooks/useServicesCache';

interface Service {
  id: number;
  type_id: number;
  status_id: number;
  construction_id: number;
  comment: string | null;
  service_type?: { id: number; name: string };
  services_status?: { id: number; name: string };
}

interface ClientDocumentManagementWizardProps {
  service: Service;
  onClose: () => void;
  onSuccess: (constructionId: number) => void;
}

export default function ClientDocumentManagementWizard({
  service,
  onClose,
  onSuccess,
}: ClientDocumentManagementWizardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientManagementStatusId, setClientManagementStatusId] = useState<
    number | null
  >(null);
  const { clearCache } = useServicesCache();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data: statusData, error: statusError } = await supabase
          .from('services_status')
          .select('id, name')
          .eq('id', 10)
          .single();
        if (statusError)
          throw new Error(
            'No se pudo obtener el estado "Cliente realiza la gestión"'
          );
        setClientManagementStatusId(statusData.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const handleConfirm = async () => {
      if (!clientManagementStatusId || !showConfirm) return;
      try {
        setProcessing(true);
        const { error: updateError } = await supabase
          .from('services')
          .update({ status_id: clientManagementStatusId })
          .eq('id', service.id);
        if (updateError)
          throw new Error(
            `Error actualizando estado del servicio: ${updateError.message}`
          );
        onSuccess(service.construction_id);
        onClose();
        clearCache();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error completando el proceso'
        );
      } finally {
        setProcessing(false);
      }
    };
    if (showConfirm && !processing) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfirm]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-red-800">Error</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Cliente Realiza la Gestión
              </h2>
              <p className="text-sm text-gray-600">
                {service.service_type?.name || `Servicio ${service.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {!showConfirm ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¿Estás seguro de que quieres marcar este servicio como "Cliente
                realiza la gestión"?
              </h3>
              <p className="text-gray-500 mb-6">
                Esta acción actualizará el estado del servicio y no se podrá
                deshacer.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={processing}
                >
                  Confirmar
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  disabled={processing}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Procesando...
              </h3>
              <p className="text-gray-500 mb-6">
                Se está actualizando el estado del servicio.
              </p>
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                disabled
              >
                Procesando
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
