import React from 'react';
import { Check } from 'lucide-react';

// Tracker visual para el estado del servicio
export function ServiceProgressTracker({
  service,
  serviceTypeStatuses,
  isIncidence,
}: {
  service: any;
  serviceTypeStatuses: any[];
  isIncidence?: boolean;
}) {
  // Determinar el estado activo para el tracker
  const getCurrentServiceTypeStatusIndex = (statusId: number) => {
    return serviceTypeStatuses.findIndex(
      (sts: any) => sts.services_status.id === statusId
    );
  };
  // Si el estado actual no está en la barra de progreso, usar previous_status_id
  let trackerStatusId = service.status_id;
  let progressStatusId = trackerStatusId;
  const currentIndex = getCurrentServiceTypeStatusIndex(trackerStatusId);
  if (currentIndex === -1 && service.previous_status_id) {
    trackerStatusId = service.previous_status_id;
    progressStatusId = service.previous_status_id;
  }
  return (
    <div className="mb-2">
      <div className="relative w-full pb-2">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"></div>
        <div
          className={`absolute top-4 left-0 h-0.5 transition-all duration-500 ${
            isIncidence ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{
            width: `${
              serviceTypeStatuses.length > 0
                ? (getCurrentServiceTypeStatusIndex(progressStatusId) /
                    (serviceTypeStatuses.length - 1)) *
                  100
                : 0
            }%`,
          }}
        ></div>
        <div className="relative flex justify-between w-full">
          {serviceTypeStatuses.map((statusConfig, index) => {
            const status = statusConfig.services_status;
            // El estado activo es el actual, pero los checks solo hasta el anterior si es revisión/incidencia
            const isActive = status.id === trackerStatusId;
            const isPassed =
              index < getCurrentServiceTypeStatusIndex(progressStatusId);
            return (
              <div
                key={status.id}
                className="flex flex-col items-center"
                style={{
                  flex: '1',
                  maxWidth: `${100 / serviceTypeStatuses.length}%`,
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isIncidence
                      ? isActive
                        ? 'bg-red-500 border-red-500'
                        : isPassed
                        ? 'bg-red-300 border-red-300'
                        : 'bg-white border-gray-300'
                      : isActive
                      ? 'bg-blue-500 border-blue-500'
                      : isPassed
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : isActive ? (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  ) : (
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  )}
                </div>
                <div className="mt-1 text-center w-full px-1">
                  <p
                    className={`text-xs font-medium ${
                      isIncidence
                        ? isActive
                          ? 'text-red-600'
                          : isPassed
                          ? 'text-red-400'
                          : 'text-gray-500'
                        : isActive
                        ? 'text-blue-600'
                        : isPassed
                        ? 'text-green-600'
                        : 'text-gray-500'
                    } break-words leading-tight`}
                  >
                    {status.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Caja de observaciones del servicio
export function ServiceObservations({ service }: { service: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200">
      <h5 className="text-xs font-medium text-gray-700 mb-1">Observaciones</h5>
      <div className="min-h-[32px]">
        {service.comment ? (
          <p className="text-xs text-gray-700 whitespace-pre-wrap">
            {service.comment}
          </p>
        ) : (
          <p className="text-xs text-gray-500 italic">
            No hay observaciones para este servicio
          </p>
        )}
      </div>
    </div>
  );
}
