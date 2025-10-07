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
      <div className="relative bg-zen-grey-25 rounded-xl w-[333px] mx-4 overflow-hidden shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]">
        {/* Gradient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute"
            style={{
              width: '556.125px',
              height: '232px',
              left: '-133.14px',
              top: '240px',
            }}
          >
            <div
              className="rotate-90"
              style={{
                width: '232px',
                height: '556.138px',
                background:
                  'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.25) 0%, rgba(133, 163, 255, 0) 100%)',
                filter: 'blur(80px)',
              }}
            />
          </div>
          <div
            className="absolute"
            style={{
              width: '808px',
              height: '209.578px',
              left: '243px',
              top: '372px',
            }}
          >
            <div
              className="rotate-90"
              style={{
                width: '209.6px',
                height: '808px',
                background:
                  'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.15) 0%, rgba(133, 163, 255, 0) 100%)',
                filter: 'blur(60px)',
              }}
            />
          </div>
        </div>

        {/* Close button */}
        <div className="relative flex justify-end px-4 py-[10px]">
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-[10px] rounded-lg"
          >
            <img src="/close-icon.svg" alt="" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative px-8 pb-6">
          {!showConfirm ? (
            <div className="flex flex-col gap-3 items-center">
              {/* Service and info */}
              <div className="flex flex-col gap-4 items-center p-3 rounded-xl w-full">
                {/* Icon */}
                <div className="flex flex-col gap-1 items-center w-full">
                  <div className="bg-zen-warning-100 flex gap-2 items-center p-1 rounded">
                    <div className="rounded-lg overflow-hidden w-8 h-8">
                      <img src="/warning-figma.svg" alt="" className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* TEXT */}
                <div className="flex flex-col gap-2 items-start w-full">
                  {/* Title */}
                  <div className="flex gap-1 items-center justify-center w-full">
                    <p
                      className="text-base font-semibold text-zen-grey-950 text-center flex-1"
                      style={{ lineHeight: '1.47' }}
                    >
                      Vas a cancelar el suministro de{' '}
                      {service.service_type?.name || 'este servicio'}
                    </p>
                  </div>
                  {/* Info */}
                  <div className="flex flex-col gap-1 items-center w-full">
                    <p
                      className="text-sm font-normal text-zen-grey-700 text-center w-full"
                      style={{ lineHeight: '1.25' }}
                    >
                      Si cancelas el suministro no lo gestionaremos por ti
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={onClose}
                  className="flex gap-2 items-center justify-center px-4 py-3  transition-colors"
                  disabled={processing}
                >
                  <span
                    className="text-base font-semibold text-zen-blue-500 whitespace-pre"
                    style={{ lineHeight: '1.47' }}
                  >
                    Mantener el suministro
                  </span>
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="bg-zen-blue-500 flex gap-2 items-center justify-center px-4 py-3 rounded w-full hover:bg-zen-blue-600 transition-colors"
                  disabled={processing}
                >
                  <img src="/x-white-icon.svg" alt="" className="w-4 h-4" />
                  <span
                    className="text-base font-semibold text-zen-grey-25 whitespace-pre"
                    style={{ lineHeight: '1.47' }}
                  >
                    Cancelar suministro
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Processing state */}
              <h3 className="text-xl font-semibold text-zen-grey-950 mb-3">
                Procesando...
              </h3>
              <p className="text-base text-zen-grey-600 mb-8">
                Se está actualizando el estado del servicio.
              </p>
              <button
                className="px-6 py-3 bg-zen-blue-500 text-white rounded-lg opacity-50 cursor-not-allowed"
                disabled
              >
                <span className="text-sm font-semibold">Procesando</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
