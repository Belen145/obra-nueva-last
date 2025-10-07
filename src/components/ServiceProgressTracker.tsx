import React from 'react';

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

  // Si es incidencia, usar el previous_status_id para el tracker
  let trackerStatusId = service.status_id;
  if (isIncidence && service.previous_status_id) {
    trackerStatusId = service.previous_status_id;
  }

  const currentIndex = getCurrentServiceTypeStatusIndex(trackerStatusId);
  const totalSteps = serviceTypeStatuses.length;

  // Determinar si mostrar barra de progreso y su color
  const isSinGestionar = service.services_status?.name === 'Sin Gestionar';
  const isEnRevision = service.services_status?.name === 'En Revisión';
  const isActivated = service.services_status?.name === 'Activado';
  const isCanceled = service.services_status?.name === 'Cancelado';
  const noActiveStep = currentIndex === -1;

  let showProgressBar = true;
  let progressBarColor = '#FEB55D'; // Naranja por defecto

  // Determinar color de la barra de progreso
  if (isSinGestionar) {
    progressBarColor = '#d0d3dd'; // Gris para Sin gestionar
  } else if (isEnRevision || isCanceled || noActiveStep) {
    showProgressBar = false; // No mostrar barra para En Revisión o sin step activo
  } else if (isActivated) {
    progressBarColor = '#78EC95'; // Verde para activado
  } else if (isIncidence) {
    progressBarColor = '#F97066'; // Rojo para incidencia
  }

  // Calcular el porcentaje de progreso (hasta el step activo incluido)
  let progressPercentage = '0%';
  if (showProgressBar && totalSteps > 1) {
    if (currentIndex === 0) {
      // Si el primer step está activo, la barra solo rodea ese círculo
      progressPercentage = '16px';
    } else if (currentIndex === totalSteps - 1) {
      // Si el último step está activo, la barra llega al 100%
      progressPercentage = '100%';
    } else {
      // Para los demás casos, calcular para llegar hasta rodear el círculo activo
      const percentage = (currentIndex / (totalSteps - 1)) * 100;
      progressPercentage = `calc(${percentage}% + 12px)`;
    }
  }

  return (
    <div className="w-full py-2">
      {/* Progress Bar - Diseño Figma */}
      <div className="relative w-full">
        {/* Contenedor de la barra base y barra de progreso */}
        <div className="relative h-4 mb-1">
          {/* Barra base gris - rodea completamente los círculos */}
          <div
            className="absolute top-0 left-0 right-0 h-4 px-2"
            style={{
              backgroundColor: '#F2F3F7',
              borderRadius: '1000px',
            }}
          />

          {/* Barra de progreso de color */}
          {showProgressBar && (
            <div
              className="absolute top-0 h-4 transition-all duration-500"
              style={{
                width: progressPercentage,
                backgroundColor: progressBarColor,
                borderRadius: '50px',
              }}
            />
          )}

          {/* Círculos de los steps posicionados absolutamente */}
          <div className="absolute top-0 left-1 right-1 h-4 flex items-center justify-between">
            {serviceTypeStatuses.map((statusConfig, index) => {
              const status = statusConfig.services_status;
              const isActive = status.id === trackerStatusId;
              const isPassed = index < currentIndex;

              // Determinar si el círculo está activado (pasado o activo)
              const isActivatedCircle = isPassed || isActive;

              // Color del círculo
              let circleColor = '#D0D3DD'; // Gris claro para no activados
              if (isActivatedCircle && showProgressBar) {
                circleColor = progressBarColor;
              } else if (isActivatedCircle && !showProgressBar) {
                circleColor = '#D0D3DD';
              }

              return (
                <div
                  key={status.id}
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: circleColor,
                  }}
                >
                  {/* Solo mostrar círculo blanco interior si está activado */}
                  {isActivatedCircle && (
                    <div
                      className="rounded-full"
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#FCFCFC',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Etiquetas de los estados alineadas con los círculos */}
        <div className="flex w-full justify-between">
          {serviceTypeStatuses.map((statusConfig, index) => {
            const status = statusConfig.services_status;
            const isActive = status.id === trackerStatusId;
            const isFirst = index === 0;
            const isLast = index === totalSteps - 1;

            return (
              <div
                key={status.id}
                className="flex flex-col items-start"
                style={{
                  justifyContent: isFirst
                    ? 'flex-start'
                    : isLast
                    ? 'flex-end'
                    : 'center',
                  textAlign: isFirst
                    ? 'left'
                    : isLast
                    ? 'right'
                    : 'center',
                  flex: isFirst || isLast ? '0 0 auto' : '1',
                  maxWidth: isFirst || isLast ? 'none' : '100px',
                }}
              >
                <p
                  className={`text-xs ${
                    isActive ? 'font-semibold text-zen-grey-950' : 'font-normal text-zen-grey-600'
                  }`}
                  style={{
                    lineHeight: '1.35',
                    whiteSpace: isFirst || isLast ? 'normal' : 'normal',
                  }}
                >
                  {status.name}
                </p>
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
